import { createOAuthAppAuth } from "@octokit/auth-oauth-app";

export async function onRequest(context) {
  try {
    const { env } = context;
    
    // Validate required environment variables
    if (!env.GITHUB_CLIENT_ID) {
      throw new Error('GITHUB_CLIENT_ID environment variable is not set');
    }
    if (!env.BASE_URL) {
      throw new Error('BASE_URL environment variable is not set');
    }

    // Build the GitHub authorization URL
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: `${env.BASE_URL}/auth/callback`,
      scope: 'repo',
      response_type: 'code',
      state: crypto.randomUUID() // Add state parameter for security
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params}`;
    console.log('Redirecting to:', authUrl);

    return Response.redirect(authUrl, 302);
  } catch (error) {
    console.error('Login error:', error);
    return new Response(`Configuration error: ${error.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}