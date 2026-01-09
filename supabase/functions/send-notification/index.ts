import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { record } = await req.json()

  // We will add logic here to send a push notification.
  // This will require FCM server credentials.

  const data = {
    message: `Hello ${record.id}!`
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})
