import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Question {
  id: string;
  question: string;
  category: string;
  options: string[];
  display_order: number;
}

interface TopMatch {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  age?: number | null;
  location?: string | null;
}

type TestStatus = "idle" | "loading" | "answering" | "analyzing" | "results";

export const useCompatibilityTest = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<TestStatus>("idle");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [topMatches, setTopMatches] = useState<TopMatch[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Fetch questions from database
  const fetchQuestions = useCallback(async () => {
    const { data, error } = await supabase
      .from("compatibility_questions")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching questions:", error);
      return [];
    }

    return (data || []).map(q => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    })) as Question[];
  }, []);

  // Start the test
  const startTest = useCallback(async () => {
    if (!user) {
      toast.error("Tu dois être connecté pour faire le test");
      return;
    }

    setStatus("loading");
    setAnswers({});
    setCurrentQuestionIndex(0);
    setTopMatches([]);

    try {
      const fetchedQuestions = await fetchQuestions();
      if (fetchedQuestions.length === 0) {
        toast.error("Aucune question disponible");
        setStatus("idle");
        return;
      }

      setQuestions(fetchedQuestions);
      setStatus("answering");
    } catch (error) {
      console.error("Error starting test:", error);
      toast.error("Erreur lors du démarrage du test");
      setStatus("idle");
    }
  }, [user, fetchQuestions]);

  // Submit an answer (option index 0-3)
  const submitAnswer = useCallback(async (optionIndex: number) => {
    if (!user || currentQuestionIndex >= questions.length) return;

    const currentQuestion = questions[currentQuestionIndex];
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: optionIndex,
    };
    setAnswers(newAnswers);

    const nextIndex = currentQuestionIndex + 1;
    
    if (nextIndex >= questions.length) {
      // All questions answered, save and analyze
      await saveAnswersAndAnalyze(newAnswers);
    } else {
      setCurrentQuestionIndex(nextIndex);
    }
  }, [user, currentQuestionIndex, questions, answers]);

  // Save answers and find compatible matches
  const saveAnswersAndAnalyze = useCallback(async (finalAnswers: Record<string, number>) => {
    if (!user) return;

    setStatus("analyzing");
    setAnalysisProgress(0);

    try {
      // Simulate analysis progress for UX
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => Math.min(prev + 15, 85));
      }, 300);

      // Save user's answers to their profile
      await supabase
        .from("user_compatibility_profiles")
        .upsert({
          user_id: user.id,
          answers: finalAnswers,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      // Fetch all other users' compatibility profiles
      const { data: otherProfiles } = await supabase
        .from("user_compatibility_profiles")
        .select("user_id, answers")
        .neq("user_id", user.id)
        .not("completed_at", "is", null);

      // Fetch user profiles for display
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, age, location, gender");

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      // Get current user's looking_for preference
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("looking_for, gender")
        .eq("user_id", user.id)
        .single();

      // Calculate compatibility scores
      const scores: TopMatch[] = [];
      
      for (const other of (otherProfiles || [])) {
        const otherAnswers = other.answers as Record<string, number>;
        const profile = profileMap.get(other.user_id);
        
        if (!profile) continue;

        // Filter by gender preference if set
        const myLookingFor = myProfile?.looking_for || [];
        if (myLookingFor.length > 0 && profile.gender) {
          if (!myLookingFor.includes(profile.gender) && !myLookingFor.includes("tous")) {
            continue;
          }
        }

        // Calculate score
        let matchingAnswers = 0;
        let totalQuestions = 0;

        for (const questionId of Object.keys(finalAnswers)) {
          if (otherAnswers[questionId] !== undefined) {
            totalQuestions++;
            if (finalAnswers[questionId] === otherAnswers[questionId]) {
              matchingAnswers++;
            }
          }
        }

        const score = totalQuestions > 0 
          ? Math.round((matchingAnswers / totalQuestions) * 100)
          : 0;

        if (score > 0) {
          scores.push({
            userId: other.user_id,
            displayName: profile.display_name || "Inconnu",
            avatarUrl: profile.avatar_url,
            score,
            age: profile.age,
            location: profile.location,
          });

          // Cache the score
          await supabase
            .from("compatibility_scores")
            .upsert({
              user1_id: user.id,
              user2_id: other.user_id,
              score,
              calculated_at: new Date().toISOString(),
            }, {
              onConflict: "user1_id,user2_id",
            });
        }
      }

      // Sort by score descending and take top 5
      scores.sort((a, b) => b.score - a.score);
      const top5 = scores.slice(0, 5);

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      // Short delay for dramatic effect
      await new Promise(resolve => setTimeout(resolve, 500));

      setTopMatches(top5);
      setStatus("results");

    } catch (error) {
      console.error("Error analyzing compatibility:", error);
      toast.error("Erreur lors de l'analyse");
      setStatus("idle");
    }
  }, [user]);

  // Reset to start over
  const resetTest = useCallback(() => {
    setStatus("idle");
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTopMatches([]);
    setAnalysisProgress(0);
  }, []);

  return {
    status,
    questions,
    currentQuestionIndex,
    currentQuestion: questions[currentQuestionIndex],
    answers,
    topMatches,
    analysisProgress,
    progress: questions.length > 0 
      ? Math.round((currentQuestionIndex / questions.length) * 100)
      : 0,
    startTest,
    submitAnswer,
    resetTest,
  };
};
