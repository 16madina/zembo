import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    const sanitizedText = typeof text === "string" ? text.trim() : "";
    if (!sanitizedText) {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating TTS for:", sanitizedText);

    // Using Daniel - very deep, powerful voice
    const selectedVoiceId = voiceId || "onwK4e9ZLuTAKqWW03F9";

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Keep it short + strict to avoid the model "adding" extra words
          text: sanitizedText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.85, // higher stability = less improvisation
            similarity_boost: 1.0,
            style: 0.0,
            use_speaker_boost: true,
            speed: 0.9,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs TTS error:", errorText);
      throw new Error(`ElevenLabs TTS error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log("TTS generated successfully");

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating TTS:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
