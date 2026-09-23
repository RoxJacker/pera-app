/**
 * GET /api/hello
 * Endpoint de prueba — confirma que la API funciona de punta a punta
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    ok: true,
    message: 'API Belleza Pera funcionando 🌸',
    timestamp: new Date().toISOString(),
    env: {
      supabaseConfigured: !!process.env.SUPABASE_URL,
    },
  });
}
