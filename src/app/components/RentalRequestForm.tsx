import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Combobox } from "./ui/combobox";
import { toast } from "sonner";
import { useApiClient } from "../../hooks/useApiClient";
import { Loader2 } from "lucide-react";

type RentalFormData = {
  name: string;
  project: string;
  equipmentType: string;
  model: string;
  requiredByDate: string;
  expectedReturnDate: string;
  notes: string;
};

export function RentalRequestForm() {
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
  } = useForm<RentalFormData>({
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

  const onSubmit = async (data: RentalFormData) => {
    setIsSubmitting(true);
    console.log('RentalRequestForm - Submitting data:', data);
    try {
      await apiPost('/submit-rental', data);
      toast.success("Rental request submitted successfully!");
      reset();
    } catch (error: any) {
      console.error("Error submitting rental request:", error);
      toast.error(error.message || "Failed to submit rental request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Rental Equipment Request</h2>
      <p className="text-sm text-gray-600 mb-6">
        Request new rental equipment for your project.
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
            <Label htmlFor="requiredByDate">Required By Date *</Label>
            <Input
              id="requiredByDate"
              type="date"
              {...register("requiredByDate", { required: "Required by date is required" })}
            />
            {errors.requiredByDate && (
              <p className="text-sm text-red-600">{errors.requiredByDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedReturnDate">Expected Return Date *</Label>
            <Input
              id="expectedReturnDate"
              type="date"
              {...register("expectedReturnDate", { required: "Expected return date is required" })}
            />
            {errors.expectedReturnDate && (
              <p className="text-sm text-red-600">{errors.expectedReturnDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              {...register("notes")}
              placeholder="Additional information or special requests"
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
              "Submit Rental Request"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}