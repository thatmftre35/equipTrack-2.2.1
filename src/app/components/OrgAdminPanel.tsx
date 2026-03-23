import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Loader2, Plus, Trash2, Users, Mail, Save, Upload, FolderKanban, Wrench, Home, ClipboardList } from 'lucide-react';
import { ProjectsManagement } from './ProjectsManagement';
import { EquipmentManagement } from './EquipmentManagement';
import { RequestsManagement } from './RequestsManagement';
import { useNavigate } from 'react-router';

interface ApprovedUser {
  username: string;
  organizationId: string;
  addedAt: string;
}

interface OrgSettings {
  approvalEmails: string[];
  finalEmails: string[];
  organizationName: string;
}

type TabType = 'users' | 'settings' | 'projects' | 'equipment' | 'requests';

export function OrgAdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<ApprovedUser[]>([]);
  const [settings, setSettings] = useState<OrgSettings>({ approvalEmails: [], finalEmails: [], organizationName: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // User management
  const [newUsername, setNewUsername] = useState('');
  const [csvInput, setCsvInput] = useState('');
  
  // Settings management
  const [approvalEmailsInput, setApprovalEmailsInput] = useState('');
  const [finalEmailsInput, setFinalEmailsInput] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadUsers(), loadSettings()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee/users`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'X-Organization-Id': user?.organizationId || '',
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      const orgUsers = (data.users || []).filter((u: ApprovedUser) => u.organizationId === user?.organizationId);
      setUsers(orgUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee/organization-settings`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'X-Organization-Id': user?.organizationId || '',
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data);
      setApprovalEmailsInput((data.approvalEmails || []).join(', '));
      setFinalEmailsInput((data.finalEmails || []).join(', '));
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUsername.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee/add-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
            'X-Organization-Id': user?.organizationId || '',
          },
          body: JSON.stringify({
            username: newUsername.trim(),
            organizationId: user?.organizationId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add user');
      }

      toast.success('User added successfully!');
      setNewUsername('');
      loadUsers();
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error(error.message || 'Failed to add user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!confirm(`Are you sure you want to remove user "${username}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee/delete-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ username }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      toast.success('User removed successfully!');
      loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const handleCSVUpload = (csv: string) => {
    const lines = csv.split('\n').map(line => line.trim()).filter(line => line);
    const usernames = lines.flatMap(line => 
      line.split(',').map(item => item.trim()).filter(item => item)
    );

    if (usernames.length === 0) {
      toast.error('No valid usernames found');
      return;
    }

    // Add all users
    Promise.all(
      usernames.map(username =>
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee/add-user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${publicAnonKey}`,
              'X-Organization-Id': user?.organizationId || '',
            },
            body: JSON.stringify({
              username,
              organizationId: user?.organizationId,
            }),
          }
        )
      )
    ).then(() => {
      toast.success(`Added ${usernames.length} users successfully!`);
      setCsvInput('');
      loadUsers();
    }).catch(error => {
      console.error('Error adding users:', error);
      toast.error('Failed to add some users');
    });
  };

  const handleSaveSettings = async () => {
    const approvalEmails = approvalEmailsInput
      .split(',')
      .map(email => email.trim())
      .filter(email => email);

    const finalEmails = finalEmailsInput
      .split(',')
      .map(email => email.trim())
      .filter(email => email);

    if (approvalEmails.length === 0) {
      toast.error('Please provide at least one approval email');
      return;
    }

    if (finalEmails.length === 0) {
      toast.error('Please provide at least one final email');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee/update-organization-settings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
            'X-Organization-Id': user?.organizationId || '',
          },
          body: JSON.stringify({
            organizationId: user?.organizationId,
            approvalEmails,
            finalEmails,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update settings');
      }

      toast.success('Settings updated successfully!');
      loadSettings();
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user?.isOrgAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Access denied. Organization admin only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Organization Settings</h2>
          <p className="text-sm text-gray-600">
            Manage your organization's users and settings.
          </p>
        </div>
        <Button onClick={() => navigate('/')} variant="outline">
          <Home className="w-4 h-4 mr-2" />
          Back to Forms
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          className={`flex items-center py-2 px-4 font-medium transition-colors ${
            activeTab === 'users' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('users')}
        >
          <Users className="w-4 h-4 mr-2" />
          Users
        </button>
        <button
          className={`flex items-center py-2 px-4 font-medium transition-colors ${
            activeTab === 'settings' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('settings')}
        >
          <Mail className="w-4 h-4 mr-2" />
          Email Settings
        </button>
        <button
          className={`flex items-center py-2 px-4 font-medium transition-colors ${
            activeTab === 'projects' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('projects')}
        >
          <FolderKanban className="w-4 h-4 mr-2" />
          Projects
        </button>
        <button
          className={`flex items-center py-2 px-4 font-medium transition-colors ${
            activeTab === 'equipment' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('equipment')}
        >
          <Wrench className="w-4 h-4 mr-2" />
          Equipment
        </button>
        <button
          className={`flex items-center py-2 px-4 font-medium transition-colors ${
            activeTab === 'requests' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('requests')}
        >
          <ClipboardList className="w-4 h-4 mr-2" />
          Requests
        </button>
      </div>

      {/* Destination Emails */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Email Settings</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approval-emails">Approval Emails</Label>
              <Textarea
                id="approval-emails"
                value={approvalEmailsInput}
                onChange={(e) => setApprovalEmailsInput(e.target.value)}
                placeholder="email1@example.com, email2@example.com"
                rows={3}
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500">
                Receives notifications when a request is submitted (simple notification, must log in to approve)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="final-emails">Final Emails</Label>
              <Textarea
                id="final-emails"
                value={finalEmailsInput}
                onChange={(e) => setFinalEmailsInput(e.target.value)}
                placeholder="email1@example.com, email2@example.com"
                rows={3}
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500">
                Receives full request details after approval by org admin
              </p>
            </div>
            
            <Button onClick={handleSaveSettings} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Email Settings
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* User Management */}
      {activeTab === 'users' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Approved Users</h3>
          </div>

          {/* Add Single User */}
          <form onSubmit={handleAddUser} className="mb-6">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Enter username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <Button type="submit" disabled={isSubmitting}>
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>
          </form>

          {/* Bulk Upload */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <Label htmlFor="csv-input" className="mb-2 block">Bulk Add Users (CSV)</Label>
            <Textarea
              id="csv-input"
              placeholder="username1, username2, username3&#10;Or one per line:&#10;username1&#10;username2&#10;username3"
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              rows={4}
              disabled={isSubmitting}
            />
            <Button
              type="button"
              onClick={() => handleCSVUpload(csvInput)}
              disabled={isSubmitting || !csvInput.trim()}
              variant="outline"
              className="mt-2"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Users
            </Button>
          </div>

          {/* Users List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No users yet. Add users above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Username</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Added</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((approvedUser) => (
                    <tr key={approvedUser.username} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {approvedUser.username}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(approvedUser.addedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(approvedUser.username)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Projects Management */}
      {activeTab === 'projects' && (
        <ProjectsManagement />
      )}

      {/* Equipment Management */}
      {activeTab === 'equipment' && (
        <EquipmentManagement />
      )}

      {/* Requests Management */}
      {activeTab === 'requests' && (
        <RequestsManagement />
      )}
    </div>
  );
}