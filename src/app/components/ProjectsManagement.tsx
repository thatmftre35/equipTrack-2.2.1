import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import { useApiClient } from "../../hooks/useApiClient";
import { Loader2, Plus, Trash2, Upload, Save } from "lucide-react";

export function ProjectsManagement() {
  const [projects, setProjects] = useState<string[]>([]);
  const [savedProjects, setSavedProjects] = useState<string[]>([]);
  const [newProject, setNewProject] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [csvInput, setCsvInput] = useState("");
  const { apiGet, apiPost } = useApiClient();

  const hasUnsavedChanges = JSON.stringify(projects) !== JSON.stringify(savedProjects);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const data = await apiGet("/projects");
      setProjects(data.projects || []);
      setSavedProjects(data.projects || []);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  };

  const saveProjects = async (updatedProjects?: string[]) => {
    const projectsToSave = updatedProjects || projects;
    setIsSaving(true);
    try {
      console.log('Saving projects:', projectsToSave);
      const response = await apiPost("/projects", {
        projects: projectsToSave,
      });
      console.log('Save projects response:', response);

      // Reload from server to verify save
      await loadProjects();
      toast.success("Projects saved successfully!");
    } catch (error) {
      console.error("Error saving projects:", error);
      toast.error(`Failed to save projects: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProject = () => {
    if (!newProject.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    if (projects.includes(newProject.trim())) {
      toast.error("Project already exists");
      return;
    }

    const updatedProjects = [...projects, newProject.trim()];
    setProjects(updatedProjects);
    setNewProject("");
  };

  const handleRemoveProject = (index: number) => {
    const updatedProjects = projects.filter((_, i) => i !== index);
    setProjects(updatedProjects);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvInput(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (csv: string) => {
    const lines = csv.split('\n').map(line => line.trim()).filter(line => line);
    const newProjects = lines.flatMap(line => 
      line.split(',').map(item => item.trim()).filter(item => item)
    );

    if (newProjects.length === 0) {
      toast.error("No valid projects found in CSV");
      return;
    }

    // Merge with existing projects, avoiding duplicates
    const uniqueProjects = Array.from(new Set([...projects, ...newProjects]));
    setProjects(uniqueProjects);
    setCsvInput("");
  };

  const handleManualCSVParse = () => {
    if (!csvInput.trim()) {
      toast.error("Please enter project names");
      return;
    }
    parseCSV(csvInput);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Manage Projects</h2>
        <Button 
          onClick={() => saveProjects()} 
          disabled={isSaving || !hasUnsavedChanges}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Projects
            </>
          )}
        </Button>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Add or remove projects that will appear in the project dropdowns across all forms.
        {hasUnsavedChanges && (
          <span className="ml-2 text-orange-600 font-semibold">● Unsaved changes</span>
        )}
      </p>

      <div className="space-y-8">
        {/* Add Single Project */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Add Project Manually</h3>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Enter project name"
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddProject();
                  }
                }}
              />
            </div>
            <Button onClick={handleAddProject} disabled={isSaving}>
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          </div>
        </div>

        {/* Upload CSV */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Upload CSV or Enter Multiple</h3>
          <div className="space-y-2">
            <Label htmlFor="csv-upload">Upload CSV File</Label>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv,.txt"
              onChange={handleCSVUpload}
              disabled={isSaving}
            />
            <p className="text-xs text-gray-500">
              Upload a CSV file with project names (comma-separated or one per line)
            </p>
            <p className="text-xs text-blue-600">
              💡 Tip: Convert Excel tables to CSV in Excel → File → Save As → CSV
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-input">Or Enter CSV Data Manually</Label>
            <Textarea
              id="csv-input"
              placeholder="Project A, Project B, Project C&#10;Or one per line:&#10;Project A&#10;Project B&#10;Project C"
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              rows={5}
            />
            <Button onClick={handleManualCSVParse} disabled={isSaving} variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import Projects
            </Button>
          </div>
        </div>

        {/* Current Projects List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Current Projects</h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No projects added yet.</p>
          ) : (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
              {projects.map((project, index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50">
                  <span className="text-sm text-gray-900">{project}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveProject(index)}
                    disabled={isSaving}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}