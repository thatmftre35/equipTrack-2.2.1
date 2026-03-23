import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Loader2, Check, X, ClipboardList } from 'lucide-react';

interface PendingRequest {
  id: string;
  type: 'calloff' | 'rental' | 'owned';
  submittedBy: string;
  submittedAt: string;
  data: any;
}

export function RequestsManagement() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee/pending-requests`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'X-Organization-Id': user?.organizationId || '',
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Failed to load pending requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee/approve-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
            'X-Organization-Id': user?.organizationId || '',
          },
          body: JSON.stringify({ requestId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve request');
      }

      toast.success('Request approved! Email sent to final recipients.');
      loadRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error(error.message || 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (requestId: string) => {
    if (!confirm('Are you sure you want to deny this request? This action cannot be undone.')) {
      return;
    }

    setProcessingId(requestId);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee/deny-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
            'X-Organization-Id': user?.organizationId || '',
          },
          body: JSON.stringify({ requestId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to deny request');
      }

      toast.success('Request denied.');
      loadRequests();
    } catch (error: any) {
      console.error('Error denying request:', error);
      toast.error(error.message || 'Failed to deny request');
    } finally {
      setProcessingId(null);
    }
  };

  const getRequestTypeBadge = (type: string) => {
    switch (type) {
      case 'calloff':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">Call Off</span>;
      case 'rental':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Rental</span>;
      case 'owned':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">Owned</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">Unknown</span>;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <ClipboardList className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Pending Requests</h3>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Review and approve or deny equipment requests. Once approved, the full details will be emailed to your final recipient list.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No pending requests</p>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getRequestTypeBadge(request.type)}
                    <span className="text-sm font-medium text-gray-900">{request.submittedBy}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(request.submittedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApprove(request.id)}
                    disabled={processingId === request.id}
                    className="border-green-600 text-green-600 hover:bg-green-50"
                  >
                    {processingId === request.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeny(request.id)}
                    disabled={processingId === request.id}
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Deny
                  </Button>
                </div>
              </div>

              <div className="bg-gray-50 rounded p-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  {request.type === 'calloff' && (
                    <>
                      <div><span className="font-medium">Project:</span> {request.data.project || 'N/A'}</div>
                      <div><span className="font-medium">Equipment:</span> {request.data.equipmentType}</div>
                      <div><span className="font-medium">Model:</span> {request.data.model}</div>
                      <div><span className="font-medium">Call Off Date:</span> {request.data.callOffDate}</div>
                      {request.data.notes && (
                        <div className="col-span-2"><span className="font-medium">Notes:</span> {request.data.notes}</div>
                      )}
                    </>
                  )}
                  {request.type === 'rental' && (
                    <>
                      <div><span className="font-medium">Project:</span> {request.data.project || 'N/A'}</div>
                      <div><span className="font-medium">Equipment:</span> {request.data.equipmentType}</div>
                      <div><span className="font-medium">Model:</span> {request.data.model}</div>
                      <div><span className="font-medium">Required By:</span> {request.data.requiredByDate}</div>
                      <div><span className="font-medium">Return:</span> {request.data.expectedReturnDate}</div>
                      {request.data.notes && (
                        <div className="col-span-2"><span className="font-medium">Notes:</span> {request.data.notes}</div>
                      )}
                    </>
                  )}
                  {request.type === 'owned' && (
                    <>
                      <div><span className="font-medium">Project:</span> {request.data.project || 'N/A'}</div>
                      <div><span className="font-medium">Items:</span> {request.data.equipment?.length || 0}</div>
                      {request.data.notes && (
                        <div className="col-span-2"><span className="font-medium">Notes:</span> {request.data.notes}</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
