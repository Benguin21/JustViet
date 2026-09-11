"use client";

import { useMemo, useState } from "react";
import { VocabPageHeader, type VocabTab } from "@/components/vocab/VocabPageHeader";
import { VocabDashboard } from "@/components/vocab/VocabDashboard";
import { CardList } from "@/components/vocab/CardList";
import { CardFormModal } from "@/components/vocab/CardFormModal";
import { CardDetailModal } from "@/components/vocab/CardDetailModal";
import { BatchImportModal } from "@/components/vocab/BatchImportModal";
import { StudySession } from "@/components/vocab/StudySession";
import { SettingsPanel } from "@/components/vocab/SettingsPanel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";
import { useVocabData } from "@/lib/vocab/useVocabData";
import { buildStudyQueue, computeTodayStats } from "@/lib/vocab/scheduler";
import { startOfDay } from "@/lib/vocab/srs";
import { useNow } from "@/lib/useNow";
import { useToast } from "@/lib/useToast";
import type { VocabCard } from "@/lib/vocab/types";

export default function VocabSrsPage() {
  const {
    cards,
    reviewLogs,
    settings,
    loading,
    error,
    addCard,
    addCards,
    editCard,
    removeCard,
    setSuspended,
    resetProgress,
    reviewCard,
    saveSettings,
    rescheduleAllCards,
  } = useVocabData();

  const [tab, setTab] = useState<VocabTab>("cards");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingCard, setEditingCard] = useState<VocabCard | null>(null);
  const [viewingCard, setViewingCard] = useState<VocabCard | null>(null);
  const [deletingCard, setDeletingCard] = useState<VocabCard | null>(null);
  const [singleCardQueue, setSingleCardQueue] = useState<VocabCard[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const { message: toastMessage, showToast } = useToast();

  const now = useNow();
  const todayStats = useMemo(() => computeTodayStats(cards, now), [cards, now]);

  const todaysLogs = useMemo(() => {
    const cutoff = startOfDay(now);
    return reviewLogs.filter((log) => log.reviewedAt >= cutoff);
  }, [reviewLogs, now]);

  const fullStudyQueue = useMemo(
    () => buildStudyQueue(cards, settings, { now, todaysLogs }),
    [cards, settings, todaysLogs, now],
  );

  function startStudying(card?: VocabCard) {
    setSingleCardQueue(card ? [card] : null);
    setTab("study");
  }

  async function handleDeleteFromList() {
    if (!deletingCard) return;
    try {
      await removeCard(deletingCard.id);
      setDeletingCard(null);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (loading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <span
          className="h-10 w-10 animate-spin rounded-full border-4 border-red-300 border-t-red-500"
          aria-hidden="true"
        />
        {/* Shown if a fetch is failing repeatedly rather than just being slow —
            `loading` itself always resolves once the attempt settles (see
            useVocabData), so this is a courtesy message, not a stuck state. */}
        {error && (
          <p className="max-w-sm text-center text-sm font-semibold text-red-600">{error}</p>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <VocabPageHeader
        totalCards={cards.length}
        dueToday={todayStats.due}
        activeTab={tab}
        onTabChange={(next) => {
          setSingleCardQueue(null);
          setTab(next);
        }}
        onAddCard={() => setShowAddModal(true)}
        onImportCards={() => setShowImportModal(true)}
      />

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">{error}</p>
      )}
      {listError && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
          {listError}
        </p>
      )}

      {tab === "cards" && (
        <>
          <VocabDashboard cards={cards} reviewLogs={reviewLogs} />
          <CardList
            cards={cards}
            onAddCard={() => setShowAddModal(true)}
            onSelectCard={setViewingCard}
            onEditCard={setEditingCard}
            onDeleteCard={setDeletingCard}
            onStudyCard={(card) => startStudying(card)}
          />
        </>
      )}

      {tab === "study" && (
        <StudySession
          key={singleCardQueue ? `single-${singleCardQueue[0].id}` : "queue"}
          queue={singleCardQueue ?? fullStudyQueue}
          settings={settings}
          onRate={reviewCard}
          onFinish={() => {
            setSingleCardQueue(null);
            setTab("cards");
          }}
        />
      )}

      {tab === "settings" && (
        <SettingsPanel
          settings={settings}
          onSave={saveSettings}
          onRescheduleAll={rescheduleAllCards}
        />
      )}

      {showAddModal && (
        <CardFormModal
          onClose={() => setShowAddModal(false)}
          onSubmit={async (input) => {
            await addCard(input);
            showToast("Card created");
          }}
        />
      )}

      {showImportModal && (
        <BatchImportModal
          existingCards={cards}
          onClose={() => setShowImportModal(false)}
          onImport={async (inputs) => {
            await addCards(inputs);
            showToast("Cards imported successfully");
          }}
        />
      )}

      {editingCard && (
        <CardFormModal
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onSubmit={async (input) => {
            await editCard(editingCard.id, input);
            showToast("Card updated");
          }}
          onResetProgress={() => resetProgress(editingCard.id)}
        />
      )}

      {viewingCard && (
        <CardDetailModal
          card={cards.find((c) => c.id === viewingCard.id) ?? viewingCard}
          reviewHistory={reviewLogs.filter((log) => log.cardId === viewingCard.id)}
          onClose={() => setViewingCard(null)}
          onEdit={() => {
            setEditingCard(viewingCard);
            setViewingCard(null);
          }}
          onDelete={async () => {
            await removeCard(viewingCard.id);
            setViewingCard(null);
          }}
          onToggleSuspend={() => setSuspended(viewingCard.id, !viewingCard.suspended)}
          onStudyNow={() => {
            setViewingCard(null);
            startStudying(viewingCard);
          }}
        />
      )}

      {deletingCard && (
        <ConfirmDialog
          title="Delete this card?"
          description={`"${deletingCard.front}" and its full review history will be permanently deleted. This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteFromList}
          onCancel={() => setDeletingCard(null)}
        />
      )}

      {toastMessage && <Toast message={toastMessage} />}
    </main>
  );
}
