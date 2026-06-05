// functions/_middleware.js
// Intercepta todas las rutas /api/* y aplica CORS + manejo de errores global

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // Solo interceptar rutas /api/
  if (!url.pathname.startsWith('/api/')) {
    return next();
  }

  // CORS headers para todas las respuestas de la API
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  // Preflight OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const response = await next();
    // Inyectar CORS en todas las respuestas API
    const newResponse = new Response(response.body, response);
    Object.entries(corsHeaders).forEach(([k, v]) => newResponse.headers.set(k, v));
    return newResponse;
  } catch (err) {
    console.error('API error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
