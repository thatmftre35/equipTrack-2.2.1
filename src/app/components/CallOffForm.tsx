import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Combobox } from "./ui/combobox";
import { toast } from "sonner";
import { useApiClient } from "../../hooks/useApiClient";
import { Loader2, ClipboardList, CheckCircle2 } from "lucide-react";

type CallOffFormData = {
  name: string;
  project: string;
  equipmentType: string;
  model: string;
  callOffDate: string;
  notes: string;
};

export function CallOffForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState<string[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<CallOffFormData>({
    defaultValues: {
      notes: '',
    },
  });
  const { apiGet, apiPost } = useApiClient();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const data = await apiGet('/projects');
      setProjects(data.projects || []);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const onSubmit = async (data: CallOffFormData) => {
    setIsSubmitting(true);
    console.log('CallOffForm - Submitting data:', data);
    console.log('CallOffForm - Notes value:', data.notes);
    console.log('CallOffForm - Notes type:', typeof data.notes);
    try {
      await apiPost('/submit-calloff', data);
      toast.success("Call off submitted successfully!");
      // Reset form
      reset();
    } catch (error: any) {
      console.error("Error submitting call off:", error);
      toast.error(error.message || "Failed to submit call off");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Equipment Call Off</h2>
      <p className="text-sm text-gray-600 mb-6">
        Submit a call off for rental equipment currently on site.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register("name", { required: "Name is required" })}
              placeholder="Enter your name"
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">Project</Label>
            {isLoadingProjects ? (
              <div className="flex items-center justify-center h-10 border rounded-md">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : (
              <Controller
                name="project"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <Combobox
                    value={field.value}
                    onValueChange={field.onChange}
                    options={projects}
                    placeholder="Include in notes if not found"
                    emptyMessage="No projects available. Add projects in Projects management."
                  />
                )}
              />
            )}
            {errors.project && (
              <p className="text-sm text-red-600">{errors.project.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="equipmentType">Equipment Type *</Label>
            <Input
              id="equipmentType"
              {...register("equipmentType", { required: "Equipment type is required" })}
              placeholder="e.g., Excavator, Crane"
            />
            {errors.equipmentType && (
              <p className="text-sm text-red-600">{errors.equipmentType.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model *</Label>
            <Input
              id="model"
              {...register("model", { required: "Model is required" })}
              placeholder="e.g., CAT 320, JCB 3CX"
            />
            {errors.model && (
              <p className="text-sm text-red-600">{errors.model.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="callOffDate">Call Off Date *</Label>
            <Input
              id="callOffDate"
              type="date"
              {...register("callOffDate", { required: "Call off date is required" })}
            />
            {errors.callOffDate && (
              <p className="text-sm text-red-600">{errors.callOffDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              {...register("notes")}
              placeholder="Enter any additional notes"
            />
          </div>
        </div>

        <div className="pt-4">
          <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Call Off"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}