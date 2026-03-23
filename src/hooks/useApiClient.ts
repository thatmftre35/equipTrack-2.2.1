import { useAuth } from '../contexts/AuthContext';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export function useApiClient() {
  const { user } = useAuth();

  const getHeaders = (includeContentType = false) => {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${publicAnonKey}`,
    };

    if (user?.organizationId) {
      headers['X-Organization-Id'] = user.organizationId;
    }

    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  };

  const apiGet = async (endpoint: string) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const headers = getHeaders();
    console.log('API GET Request:', {
      endpoint: cleanEndpoint,
      url: `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee${cleanEndpoint}`,
      headers,
      organizationId: user?.organizationId
    });
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee${cleanEndpoint}`,
      {
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      console.error('API GET Error:', error);
      throw new Error(error.error || 'Request failed');
    }

    const result = await response.json();
    console.log('API GET Response:', result);
    return result;
  };

  const apiPost = async (endpoint: string, data: any) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const headers = getHeaders(true);
    console.log('API POST Request:', {
      endpoint: cleanEndpoint,
      url: `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee${cleanEndpoint}`,
      headers,
      data,
      organizationId: user?.organizationId
    });
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee${cleanEndpoint}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      console.error('API POST Error:', error);
      throw new Error(error.error || 'Request failed');
    }

    const result = await response.json();
    console.log('API POST Response:', result);
    return result;
  };

  return { apiGet, apiPost };
}
