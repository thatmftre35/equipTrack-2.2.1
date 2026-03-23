import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Loader2, Plus, Building2, LogOut, Edit, Trash2, Users, Home } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  username: string;
  password: string;
  organizationCode: string;
  destinationEmails: string[];
  createdAt: string;
  userCount: number;
}

export function OrganizationManagement() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    organizationId: '',
    organizationName: '',
    username: '',
    password: '',
    organizationCode: '',
    destinationEmails: '',
    approvedUsers: '',
  });

  const resetForm = () => {
    setFormData({
      organizationId: '',
      organizationName: '',
      username: '',
      password: '',
      organizationCode: '',
      destinationEmails: '',
      approvedUsers: '',
    });
    setIsEditMode(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.organizationId.trim() || !formData.organizationName.trim() || 
        !formData.username.trim() || !formData.password.trim() || !formData.organizationCode.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate organization code is 3 letters
    if (!/^[A-Za-z]{3}$/.test(formData.organizationCode)) {
      toast.error('Organization code must be exactly 3 letters');
      return;
    }

    // Parse and validate emails
    const emails = formData.destinationEmails
      .split(',')
      .map(email => email.trim())
      .filter(email => email);

    if (emails.length === 0) {
      toast.error('Please provide at least one destination email');
      return;
    }

    // Parse approved users
    const users = formData.approvedUsers
      .split(/[\n,]/)
      .map(user => user.trim())
      .filter(user => user);

    setIsSubmitting(true);
    try {
      const endpoint = isEditMode ? 'update-organization' : 'add-organization';
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            organizationId: formData.organizationId.trim(),
            organizationName: formData.organizationName.trim(),
            username: formData.username.trim(),
            password: formData.password,
            organizationCode: formData.organizationCode,
            destinationEmails: emails,
            approvedUsers: users,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${isEditMode ? 'update' : 'create'} organization`);
      }

      toast.success(`Organization ${isEditMode ? 'updated' : 'created'} successfully!`);
      resetForm();
      fetchOrganizations();
    } catch (error: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} organization:`, error);
      toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} organization`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchOrganizations = async () => {
    setIsLoadingOrgs(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee/organizations`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch organizations');
      }

      const data = await response.json();
      setOrganizations(data.organizations || []);
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      toast.error(error.message || 'Failed to fetch organizations');
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  const handleEdit = (org: Organization) => {
    setIsEditMode(true);
    setFormData({
      organizationId: org.id,
      organizationName: org.name,
      username: org.username,
      password: org.password,
      organizationCode: org.organizationCode,
      destinationEmails: org.destinationEmails.join(', '),
      approvedUsers: '',
    });
    // Scroll to top to show the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (orgId: string, orgName: string) => {
    if (!confirm(`Are you sure you want to delete "${orgName}"? This will permanently remove all organization data, users, and settings. This action cannot be undone.`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee/delete-organization`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            organizationId: orgId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete organization');
      }

      toast.success('Organization deleted successfully!');
      fetchOrganizations();
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      toast.error(error.message || 'Failed to delete organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  if (!user?.isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Access denied. Super admin only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isEditMode ? 'Edit Organization' : 'Create Organization'}
          </h2>
          <p className="text-sm text-gray-600">
            {isEditMode 
              ? 'Update organization settings and configuration.' 
              : 'Set up a new organization for EquipTrack. Organization admins can manage their settings after creation.'}
          </p>
        </div>
        <div className="flex gap-2">
          {isEditMode && (
            <>
              <Button 
                onClick={() => {
                  const orgList = document.getElementById('organization-list');
                  if (orgList) {
                    orgList.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }} 
                variant="outline"
              >
                <Home className="w-4 h-4 mr-2" />
                View All Organizations
              </Button>
              <Button onClick={resetForm} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create New Organization
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Organization Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Organization Details</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organizationId">Organization ID *</Label>
              <Input
                id="organizationId"
                value={formData.organizationId}
                onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                placeholder="e.g., acme-corp"
                disabled={isSubmitting || isEditMode}
              />
              <p className="text-xs text-gray-500">
                {isEditMode ? 'Organization ID cannot be changed' : 'Unique identifier (lowercase, no spaces)'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization Name *</Label>
              <Input
                id="organizationName"
                value={formData.organizationName}
                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                placeholder="e.g., ACME Corporation"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <h4 className="font-semibold text-gray-900 mb-4">Organization Admin Login</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Admin Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Organization admin username"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500">This will be used to log in as org admin</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Admin Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Set admin password"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizationCode">Organization Code (3 letters) *</Label>
                <Input
                  id="organizationCode"
                  value={formData.organizationCode}
                  onChange={(e) => setFormData({ ...formData, organizationCode: e.target.value })}
                  placeholder="e.g., ABC"
                  maxLength={3}
                  pattern="[A-Za-z]{3}"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500">Users need this code to log in</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h4 className="font-semibold text-gray-900 mb-4">Email Configuration</h4>
            <div className="space-y-2">
              <Label htmlFor="destinationEmails">Destination Emails (for form submissions) *</Label>
              <Textarea
                id="destinationEmails"
                value={formData.destinationEmails}
                onChange={(e) => setFormData({ ...formData, destinationEmails: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
                rows={3}
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500">
                Comma-separated list of emails that will receive form submissions
              </p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h4 className="font-semibold text-gray-900 mb-4">Approved Users (Optional)</h4>
            <div className="space-y-2">
              <Label htmlFor="approvedUsers">User List</Label>
              <Textarea
                id="approvedUsers"
                value={formData.approvedUsers}
                onChange={(e) => setFormData({ ...formData, approvedUsers: e.target.value })}
                placeholder="username1, username2, username3&#10;Or one per line:&#10;username1&#10;username2&#10;username3"
                rows={6}
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500">
                Add approved users now, or the organization admin can add them later. Comma-separated or one per line.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditMode ? 'Saving...' : 'Creating Organization...'}
                </>
              ) : (
                <>
                  {isEditMode ? (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Save
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Organization
                    </>
                  )}
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
              {isEditMode ? 'Cancel' : 'Clear Form'}
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> After creating an organization, the admin can log in using the "Organization Admin" tab 
          on the login page with their username and password to manage users, projects, equipment lists, and other settings.
        </p>
      </div>

      <div className="flex justify-end mt-4">
        <Button type="button" variant="outline" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>

      <div className="space-y-4" id="organization-list">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Manage Organizations</h2>
        <p className="text-sm text-gray-600">
          View and manage existing organizations.
        </p>
      </div>

      {/* Organization List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Organization List</h3>
        </div>

        {isLoadingOrgs ? (
          <div className="flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Admin Username
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Organization Code
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Destination Emails
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Created At
                  </th>
                  <th scope="col" className="px-6 py-3">
                    User Count
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {organizations.map(org => (
                  <tr key={org.id} className="bg-white border-b">
                    <td className="px-6 py-4">
                      {org.id}
                    </td>
                    <td className="px-6 py-4">
                      {org.name}
                    </td>
                    <td className="px-6 py-4">
                      {org.username}
                    </td>
                    <td className="px-6 py-4">
                      {org.organizationCode}
                    </td>
                    <td className="px-6 py-4">
                      {org.destinationEmails.join(', ')}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(org.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {org.userCount}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleEdit(org)}
                          className="mr-2"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleDelete(org.id, org.name)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}