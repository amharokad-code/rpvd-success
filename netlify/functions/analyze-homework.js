const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  try {
    const { imageBase64, userId, region } = JSON.parse(event.body);
    const { data: user } = await supabase.from("users").select("credits").eq("id", userId).single();
    if (!user || user.credits < 1) return { statusCode: 400, body: JSON.stringify({ error: "No credits" }) };
    await supabase.from("users").update({ credits: user.credits - 1 }).eq("id", userId);
    const geminiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + process.env.GOOGLE_AI_STUDIO_API_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ inlineData: { mimeType: "image/jpeg", data: imageBase64 } }, { text: "Analyse cet exercice. JSON: {\"level_1\":\"...\",\"level_2\":\"...\",\"level_3_steps\":[]}" }] }] })
    });
    const geminiData = await geminiResponse.json();
    const json = JSON.parse(geminiData.candidates[0].content.parts[0].text);
    await supabase.from("submissions").insert({ user_id: userId, problem_type: "generic", level_1_response: json.level_1, level_2_response: json.level_2, level_3_response: JSON.stringify(json.level_3_steps) });
    return { statusCode: 200, body: JSON.stringify(json) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
