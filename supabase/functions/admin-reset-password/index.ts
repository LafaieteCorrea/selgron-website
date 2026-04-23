import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, novaSenha } = await req.json()

    if (!userId || !novaSenha || novaSenha.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Dados inválidos.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Verifica se quem chamou é admin
    const authHeader = req.headers.get('Authorization')
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader! } } }
    )

    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { data: perfil } = await callerClient
      .from('profiles')
      .select('perfil')
      .eq('id', caller.id)
      .single()

    if (perfil?.perfil !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Apenas admins podem alterar senhas de outros usuários.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Usa service role para alterar a senha
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      password: novaSenha,
    })

    return new Response(
      JSON.stringify({ error: error?.message ?? null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
