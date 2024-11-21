import axios from 'axios';
import { createOAuthAppAuth } from "@octokit/auth-oauth-app";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': env.BASE_URL,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
  }
  
  if (url.searchParams.has('code')) {
    try {
      const code = url.searchParams.get('code');
      console.log('Starting token exchange with code:', code);

      // Prepare the request
      const tokenEndpoint = 'https://github.com/login/oauth/access_token';
      const params = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: `${env.BASE_URL}/auth/callback`
      });

      console.log('Making request to:', tokenEndpoint);
      console.log('Params:', params.toString().replace(env.GITHUB_CLIENT_SECRET, '[REDACTED]'));

      // Make the request using axios
      const response = await axios({
        method: 'post',
        url: tokenEndpoint,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Pages-CMS/1.0'
        },
        data: params.toString(),
        validateStatus: null // Don't throw on any status code
      });

      // Log response details
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      console.log('Raw response:', response.data);

      let data = response.data;
      // If response is a string, try to parse it
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          // If not JSON, try to parse as URLSearchParams
          const searchParams = new URLSearchParams(data);
          data = Object.fromEntries(searchParams.entries());
        }
      }

      console.log('Parsed response:', { ...data, access_token: data.access_token ? '[REDACTED]' : undefined });

      if (!response.status || response.status >= 400) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      if (data.error) {
        throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
      }

      if (!data.access_token) {
        throw new Error('No access token in response');
      }

      console.log('Token exchange successful');
      
      // Create redirect URL
      const redirectUrl = new URL(env.BASE_URL);
      redirectUrl.searchParams.set('access_token', data.access_token);
      
      return Response.redirect(redirectUrl.toString(), 302);
    } catch (error) {
      console.error('Detailed callback error:', error);
      if (error.response) {
        console.error('Error response:', {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data
        });
      }
      return new Response(`Authentication error: ${error.message}`, {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }
  }

  return new Response('Invalid request - no code parameter', {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
  });
}
