"use client";

import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  Divider,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
} from "@chakra-ui/react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

type CategoryRecord = {
  id: string;
  name: string;
  order: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryRecord[];
  onRefresh: () => Promise<unknown>;
};

export default function CategoryManagerModal({ isOpen, onClose, categories, onRefresh }: Props) {
  const [localCategories, setLocalCategories] = useState<CategoryRecord[]>([]);
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // categories prop이 바뀔 때마다 로컬 상태 동기화 (모달 열릴 때 포함)
  const prevIsOpen = useRef(false);
  if (isOpen && !prevIsOpen.current) {
    setLocalCategories([...categories]);
  }
  prevIsOpen.current = isOpen;

  const handleMove = async (index: number, direction: "up" | "down") => {
    const next = [...localCategories];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= next.length) return;

    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    setLocalCategories(next);

    setIsReordering(true);
    try {
      await fetch("/api/keyword-categories/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((c) => c.id) }),
      });
      await onRefresh();
    } finally {
      setIsReordering(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch("/api/keyword-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) return;

      setNewName("");
      const refreshed = await onRefresh();
      const updated = (refreshed as { categories: CategoryRecord[] } | undefined)?.categories;
      if (updated) setLocalCategories(updated);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/keyword-categories/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      const refreshed = await onRefresh();
      const updated = (refreshed as { categories: CategoryRecord[] } | undefined)?.categories;
      if (updated) setLocalCategories(updated);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>카테고리 관리</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={2}>
              {localCategories.map((cat, index) => (
                <Box
                  key={cat.id}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <HStack justify="space-between">
                    <Text fontWeight="medium">{cat.name}</Text>
                    <HStack spacing={1}>
                      <IconButton
                        aria-label="위로 이동"
                        icon={<ChevronUp size={16} />}
                        size="xs"
                        variant="ghost"
                        isDisabled={index === 0 || isReordering}
                        onClick={() => handleMove(index, "up")}
                      />
                      <IconButton
                        aria-label="아래로 이동"
                        icon={<ChevronDown size={16} />}
                        size="xs"
                        variant="ghost"
                        isDisabled={index === localCategories.length - 1 || isReordering}
                        onClick={() => handleMove(index, "down")}
                      />
                      <IconButton
                        aria-label="카테고리 삭제"
                        icon={<Trash2 size={16} />}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => setDeleteTarget(cat)}
                      />
                    </HStack>
                  </HStack>
                </Box>
              ))}
            </Stack>

            <Divider my={4} />

            <Stack spacing={2}>
              <Text fontWeight="medium" fontSize="sm" color="gray.600">
                카테고리 추가
              </Text>
              <HStack>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="카테고리 이름을 입력하세요"
                  size="sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                  }}
                />
                <Button
                  size="sm"
                  colorScheme="purple"
                  leftIcon={<Plus size={14} />}
                  onClick={handleAdd}
                  isLoading={isAdding}
                  isDisabled={!newName.trim()}
                  flexShrink={0}
                >
                  추가
                </Button>
              </HStack>
            </Stack>
          </ModalBody>

          <ModalFooter>
            <Button onClick={onClose}>닫기</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={deleteTarget !== null}
        leastDestructiveRef={cancelRef}
        onClose={() => setDeleteTarget(null)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              카테고리 삭제
            </AlertDialogHeader>
            <AlertDialogBody>
              카테고리에 등록된 키워드도 모두 삭제됩니다. 삭제하시겠습니까?
            </AlertDialogBody>
            <AlertDialogFooter gap={2}>
              <Button ref={cancelRef} onClick={() => setDeleteTarget(null)}>
                취소
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteConfirm}
                isLoading={isDeleting}
              >
                확인
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
