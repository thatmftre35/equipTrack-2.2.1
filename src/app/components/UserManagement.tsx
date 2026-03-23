import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Loader2, Plus, Trash2, Users, Building2 } from 'lucide-react';

interface ApprovedUser {
  username: string;
  organizationId: string;
  addedAt: string;
}

interface Organization {
  id: string;
  name: string;
  userCount: number;
}

export function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<ApprovedUser[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newOrgId, setNewOrgId] = useState('');
  const [newOrgName, setNewOrgName] = useState('');
  const [showAddOrg, setShowAddOrg] = useState(false);

  useEffect(() => {
    loadUsers();
    loadOrganizations();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee/users`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee/organizations`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }

      const data = await response.json();
      setOrganizations(data.organizations || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
      toast.error('Failed to load organizations');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUsername.trim() || !newOrgId.trim()) {
      toast.error('Please fill in all fields');
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
          },
          body: JSON.stringify({
            username: newUsername.trim(),
            organizationId: newOrgId.trim(),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add user');
      }

      toast.success('User added successfully!');
      setNewUsername('');
      setNewOrgId('');
      loadUsers();
      loadOrganizations();
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error(error.message || 'Failed to add user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newOrgId.trim() || !newOrgName.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee/add-organization`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            organizationId: newOrgId.trim(),
            organizationName: newOrgName.trim(),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add organization');
      }

      toast.success('Organization added successfully!');
      setNewOrgId('');
      setNewOrgName('');
      setShowAddOrg(false);
      loadOrganizations();
    } catch (error: any) {
      console.error('Error adding organization:', error);
      toast.error(error.message || 'Failed to add organization');
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
      loadOrganizations();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  if (!user?.isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">User Management</h2>
        <p className="text-sm text-gray-600">
          Manage approved users and organizations for EquipTrack.
        </p>
      </div>

      {/* Organizations Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Organizations</h3>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowAddOrg(!showAddOrg)}
            variant={showAddOrg ? "outline" : "default"}
          >
            {showAddOrg ? 'Cancel' : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Organization
              </>
            )}
          </Button>
        </div>

        {showAddOrg && (
          <form onSubmit={handleAddOrganization} className="mb-4 p-4 bg-white rounded-lg border border-blue-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="newOrgId">Organization ID *</Label>
                <Input
                  id="newOrgId"
                  value={newOrgId}
                  onChange={(e) => setNewOrgId(e.target.value)}
                  placeholder="e.g., acme-corp"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500">Unique identifier (lowercase, no spaces)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newOrgName">Organization Name *</Label>
                <Input
                  id="newOrgName"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g., ACME Corporation"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Organization'
              )}
            </Button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <div key={org.id} className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900">{org.name}</h4>
              <p className="text-sm text-gray-600">ID: {org.id}</p>
              <p className="text-sm text-gray-500 mt-2">{org.userCount} user{org.userCount !== 1 ? 's' : ''}</p>
            </div>
          ))}
          {organizations.length === 0 && (
            <p className="text-gray-500 col-span-full text-center py-4">
              No organizations yet. Add one to get started.
            </p>
          )}
        </div>
      </div>

      {/* Add User Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Add New User</h3>
        </div>

        <form onSubmit={handleAddUser} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter username"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizationId">Organization *</Label>
              <select
                id="organizationId"
                value={newOrgId}
                onChange={(e) => setNewOrgId(e.target.value)}
                disabled={isSubmitting}
                className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select organization</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting || organizations.length === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding User...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </>
            )}
          </Button>
          {organizations.length === 0 && (
            <p className="text-sm text-amber-600">Please add an organization first.</p>
          )}
        </form>
      </div>

      {/* Users List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Approved Users</h3>
        </div>

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
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Organization</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Added</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((approvedUser) => {
                  const org = organizations.find(o => o.id === approvedUser.organizationId);
                  return (
                    <tr key={approvedUser.username} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {approvedUser.username}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {org?.name || approvedUser.organizationId}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
