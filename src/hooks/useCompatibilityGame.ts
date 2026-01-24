import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Question {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  category: string;
}

interface GameState {
  gameId: string | null;
  status: "idle" | "loading" | "waiting" | "playing" | "completed";
  currentQuestionIndex: number;
  questions: Question[];
  myAnswers: Record<string, string>;
  partnerAnswers: Record<string, string>;
  compatibilityScore: number;
  partnerId: string | null;
  partnerName: string | null;
  partnerAvatar: string | null;
}

export const useCompatibilityGame = (partnerId?: string) => {
  const { user } = useAuth();
  const [state, setState] = useState<GameState>({
    gameId: null,
    status: "idle",
    currentQuestionIndex: 0,
    questions: [],
    myAnswers: {},
    partnerAnswers: {},
    compatibilityScore: 0,
    partnerId: partnerId || null,
    partnerName: null,
    partnerAvatar: null,
  });

  // Fetch questions
  const fetchQuestions = useCallback(async () => {
    const { data, error } = await supabase
      .from("compatibility_questions")
      .select("*")
      .eq("is_active", true)
      .limit(5);

    if (error) {
      console.error("Error fetching questions:", error);
      return [];
    }

    // Shuffle and pick 5
    const shuffled = (data || []).sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5) as Question[];
  }, []);

  // Fetch partner profile
  const fetchPartnerProfile = useCallback(async (partnerId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", partnerId)
      .single();

    if (data) {
      setState(prev => ({
        ...prev,
        partnerName: data.display_name,
        partnerAvatar: data.avatar_url,
      }));
    }
  }, []);

  // Start a new game
  const startGame = useCallback(async (targetPartnerId?: string) => {
    if (!user) {
      toast.error("Tu dois être connecté pour jouer");
      return;
    }

    const gamePartnerId = targetPartnerId || state.partnerId;
    if (!gamePartnerId) {
      toast.error("Aucun partenaire sélectionné");
      return;
    }

    setState(prev => ({ ...prev, status: "loading" }));

    try {
      // Fetch questions first
      const questions = await fetchQuestions();
      if (questions.length < 5) {
        toast.error("Pas assez de questions disponibles");
        setState(prev => ({ ...prev, status: "idle" }));
        return;
      }

      // Check for existing pending game
      const { data: existingGame } = await supabase
        .from("compatibility_games")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .or(`user1_id.eq.${gamePartnerId},user2_id.eq.${gamePartnerId}`)
        .in("status", ["pending", "in_progress"])
        .single();

      let gameId: string;

      if (existingGame) {
        gameId = existingGame.id;
        // Update status to in_progress if pending
        if (existingGame.status === "pending") {
          await supabase
            .from("compatibility_games")
            .update({ status: "in_progress" })
            .eq("id", gameId);
        }
      } else {
        // Create new game
        const { data: newGame, error } = await supabase
          .from("compatibility_games")
          .insert({
            user1_id: user.id,
            user2_id: gamePartnerId,
            status: "pending",
          })
          .select()
          .single();

        if (error) {
          console.error("Error creating game:", error);
          toast.error("Impossible de créer la partie");
          setState(prev => ({ ...prev, status: "idle" }));
          return;
        }
        gameId = newGame.id;
      }

      // Fetch partner profile
      await fetchPartnerProfile(gamePartnerId);

      setState(prev => ({
        ...prev,
        gameId,
        questions,
        status: "playing",
        currentQuestionIndex: 0,
        myAnswers: {},
        partnerAnswers: {},
        partnerId: gamePartnerId,
      }));

    } catch (error) {
      console.error("Error starting game:", error);
      toast.error("Erreur lors du démarrage du jeu");
      setState(prev => ({ ...prev, status: "idle" }));
    }
  }, [user, state.partnerId, fetchQuestions, fetchPartnerProfile]);

  // Submit an answer
  const submitAnswer = useCallback(async (answer: "A" | "B") => {
    if (!user || !state.gameId || state.currentQuestionIndex >= state.questions.length) {
      return;
    }

    const currentQuestion = state.questions[state.currentQuestionIndex];

    try {
      // Save answer to database
      await supabase.from("compatibility_answers").insert({
        game_id: state.gameId,
        question_id: currentQuestion.id,
        user_id: user.id,
        answer,
      });

      // Update local state
      const newMyAnswers = {
        ...state.myAnswers,
        [currentQuestion.id]: answer,
      };

      const nextIndex = state.currentQuestionIndex + 1;
      const isComplete = nextIndex >= state.questions.length;

      if (isComplete) {
        // Calculate score
        await calculateAndSaveScore(newMyAnswers);
      } else {
        setState(prev => ({
          ...prev,
          myAnswers: newMyAnswers,
          currentQuestionIndex: nextIndex,
        }));
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast.error("Erreur lors de l'envoi de la réponse");
    }
  }, [user, state.gameId, state.currentQuestionIndex, state.questions, state.myAnswers]);

  // Calculate compatibility score
  const calculateAndSaveScore = useCallback(async (myAnswers: Record<string, string>) => {
    if (!state.gameId || !user) return;

    try {
      // Fetch partner's answers
      const { data: allAnswers } = await supabase
        .from("compatibility_answers")
        .select("*")
        .eq("game_id", state.gameId);

      const partnerAnswersMap: Record<string, string> = {};
      let matchingAnswers = 0;
      let totalQuestions = 0;

      (allAnswers || []).forEach(ans => {
        if (ans.user_id !== user.id) {
          partnerAnswersMap[ans.question_id] = ans.answer;
        }
      });

      // Calculate matching answers
      Object.entries(myAnswers).forEach(([questionId, answer]) => {
        totalQuestions++;
        if (partnerAnswersMap[questionId] === answer) {
          matchingAnswers++;
        }
      });

      const score = totalQuestions > 0 
        ? Math.round((matchingAnswers / totalQuestions) * 100)
        : 0;

      // Update game in database
      await supabase
        .from("compatibility_games")
        .update({
          status: "completed",
          compatibility_score: score,
          completed_at: new Date().toISOString(),
        })
        .eq("id", state.gameId);

      setState(prev => ({
        ...prev,
        status: "completed",
        myAnswers,
        partnerAnswers: partnerAnswersMap,
        compatibilityScore: score,
      }));

    } catch (error) {
      console.error("Error calculating score:", error);
    }
  }, [state.gameId, user]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!state.gameId || !user) return;

    const channel = supabase
      .channel(`game-${state.gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "compatibility_answers",
          filter: `game_id=eq.${state.gameId}`,
        },
        (payload) => {
          const newAnswer = payload.new as any;
          if (newAnswer && newAnswer.user_id !== user.id) {
            setState(prev => ({
              ...prev,
              partnerAnswers: {
                ...prev.partnerAnswers,
                [newAnswer.question_id]: newAnswer.answer,
              },
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.gameId, user]);

  // Reset game
  const resetGame = useCallback(() => {
    setState({
      gameId: null,
      status: "idle",
      currentQuestionIndex: 0,
      questions: [],
      myAnswers: {},
      partnerAnswers: {},
      compatibilityScore: 0,
      partnerId: partnerId || null,
      partnerName: null,
      partnerAvatar: null,
    });
  }, [partnerId]);

  return {
    ...state,
    startGame,
    submitAnswer,
    resetGame,
    currentQuestion: state.questions[state.currentQuestionIndex],
    progress: state.questions.length > 0 
      ? ((state.currentQuestionIndex) / state.questions.length) * 100 
      : 0,
  };
};
