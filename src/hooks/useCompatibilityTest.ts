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

// Category weights - higher values = more important for compatibility
const CATEGORY_WEIGHTS: Record<string, number> = {
  "valeurs": 5,        // Core values are most important
  "amour": 4,          // Love/relationship views
  "personnalité": 3,   // Personality traits
  "communication": 3,  // Communication style
  "projets": 3,        // Future plans/goals
  "lifestyle": 2,      // Day-to-day lifestyle
  "loisirs": 1,        // Hobbies/leisure (nice to have)
  "default": 2,        // Fallback for unknown categories
};

const getCategoryWeight = (category: string): number => {
  const normalizedCategory = category.toLowerCase().trim();
  return CATEGORY_WEIGHTS[normalizedCategory] ?? CATEGORY_WEIGHTS["default"];
};

export const useCompatibilityTest = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<TestStatus>("idle");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [topMatches, setTopMatches] = useState<TopMatch[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const QUESTIONS_PER_GAME = 15;

  // Fetch 15 random questions from database
  const fetchQuestions = useCallback(async () => {
    const { data, error } = await supabase
      .from("compatibility_questions")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching questions:", error);
      return [];
    }

    // Shuffle and pick 15 random questions
    const allQuestions = (data || []).map(q => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    })) as Question[];

    // Fisher-Yates shuffle
    const shuffled = [...allQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, QUESTIONS_PER_GAME);
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

        // Calculate weighted score based on category importance
        let weightedMatchScore = 0;
        let totalWeight = 0;

        // Build a map of question id -> category for quick lookup
        const questionCategoryMap = new Map(
          questions.map(q => [q.id, q.category])
        );

        for (const questionId of Object.keys(finalAnswers)) {
          if (otherAnswers[questionId] !== undefined) {
            const category = questionCategoryMap.get(questionId) || "default";
            const weight = getCategoryWeight(category);
            totalWeight += weight;
            
            if (finalAnswers[questionId] === otherAnswers[questionId]) {
              weightedMatchScore += weight;
            }
          }
        }

        const score = totalWeight > 0 
          ? Math.round((weightedMatchScore / totalWeight) * 100)
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

      // Sort by score descending and take top 3
      scores.sort((a, b) => b.score - a.score);
      const top3 = scores.slice(0, 3);

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      // Short delay for dramatic effect
      await new Promise(resolve => setTimeout(resolve, 500));

      setTopMatches(top3);
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
