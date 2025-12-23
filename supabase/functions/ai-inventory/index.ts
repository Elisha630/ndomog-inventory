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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { type, itemName, category, currentQuantity, threshold, salesHistory } = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "generate_description") {
      systemPrompt = "You are a product description writer for an inventory system. Generate concise, professional product descriptions. Keep descriptions to 2-3 sentences max.";
      userPrompt = `Generate a brief product description for: "${itemName}" in category "${category}". Be specific and highlight key features.`;
    } else if (type === "restock_suggestion") {
      systemPrompt = "You are an inventory management AI assistant. Analyze stock levels and provide smart restock recommendations. Be concise and actionable.";
      userPrompt = `Analyze this inventory item and suggest restock quantity:
- Item: ${itemName}
- Category: ${category}
- Current Quantity: ${currentQuantity}
- Low Stock Threshold: ${threshold}
${salesHistory ? `- Recent Activity: ${salesHistory}` : ""}

Provide a brief recommendation with suggested restock quantity and reasoning in 2-3 sentences.`;
    } else {
      throw new Error("Invalid request type");
    }

    console.log(`Processing ${type} request for: ${itemName}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log(`Successfully generated ${type} response`);

    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in ai-inventory function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
