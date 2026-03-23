import { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Combobox } from "./ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { useApiClient } from "../../hooks/useApiClient";
import { Loader2, Plus, Trash2 } from "lucide-react";

type EquipmentItem = {
  equipmentType: string;
  model: string;
  requiredByDate: string;
  expectedReturnDate: string;
};

type OwnedEquipmentFormData = {
  name: string;
  project: string;
  equipment: EquipmentItem[];
  notes: string;
};

type EquipmentData = {
  type: string;
  models: string[];
};

export function OwnedEquipmentForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState<string[]>([]);
  const [equipmentData, setEquipmentData] = useState<EquipmentData[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(true);
  const { apiGet, apiPost } = useApiClient();
  
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<OwnedEquipmentFormData>({
    defaultValues: {
      equipment: [{ equipmentType: "", model: "", requiredByDate: "", expectedReturnDate: "" }],
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "equipment"
  });

  const equipmentItems = watch("equipment");

  useEffect(() => {
    loadProjects();
    loadEquipment();
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

  const loadEquipment = async () => {
    setIsLoadingEquipment(true);
    try {
      const data = await apiGet('/equipment');
      setEquipmentData(data.equipment || []);
    } catch (error) {
      console.error("Error loading equipment:", error);
      toast.error("Failed to load equipment");
    } finally {
      setIsLoadingEquipment(false);
    }
  };

  const getModelsForType = (type: string): string[] => {
    const equipment = equipmentData.find(e => e.type === type);
    return equipment ? equipment.models : [];
  };

  const onSubmit = async (data: OwnedEquipmentFormData) => {
    setIsSubmitting(true);
    console.log('OwnedEquipmentForm - Submitting data:', data);
    try {
      await apiPost('/submit-owned', data);
      toast.success("Owned equipment request submitted successfully!");
      // Reset form
      reset();
    } catch (error: any) {
      console.error("Error submitting owned equipment request:", error);
      toast.error(error.message || "Failed to submit owned equipment request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Owned Equipment Request</h2>
      <p className="text-sm text-gray-600 mb-6">
        Request one or more pieces of owned equipment for your project.
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
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Equipment Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ equipmentType: "", model: "", requiredByDate: "", expectedReturnDate: "" })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Equipment
            </Button>
          </div>

          {isLoadingEquipment ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Equipment #{index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`equipment.${index}.equipmentType`}>Equipment Type</Label>
                      <Controller
                        name={`equipment.${index}.equipmentType` as const}
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Reset model when type changes
                              const currentModel = equipmentItems[index]?.model;
                              if (currentModel) {
                                control._formValues.equipment[index].model = "";
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Include in notes if not found" />
                            </SelectTrigger>
                            <SelectContent>
                              {equipmentData.length === 0 ? (
                                <SelectItem value="none" disabled>
                                  No equipment available. Add equipment in Manage Equipment tab.
                                </SelectItem>
                              ) : (
                                equipmentData.map((equipment) => (
                                  <SelectItem key={equipment.type} value={equipment.type}>
                                    {equipment.type}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.equipment?.[index]?.equipmentType && (
                        <p className="text-sm text-red-600">{errors.equipment[index]?.equipmentType?.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`equipment.${index}.model`}>Model</Label>
                      <Controller
                        name={`equipment.${index}.model` as const}
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={!equipmentItems[index]?.equipmentType}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Include in notes if not found" />
                            </SelectTrigger>
                            <SelectContent>
                              {getModelsForType(equipmentItems[index]?.equipmentType).length === 0 ? (
                                <SelectItem value="none" disabled>
                                  {equipmentItems[index]?.equipmentType ? "No models available" : "Select equipment type first"}
                                </SelectItem>
                              ) : (
                                getModelsForType(equipmentItems[index]?.equipmentType).map((model) => (
                                  <SelectItem key={model} value={model}>
                                    {model}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.equipment?.[index]?.model && (
                        <p className="text-sm text-red-600">{errors.equipment[index]?.model?.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`equipment.${index}.requiredByDate`}>Required By Date *</Label>
                      <Input
                        id={`equipment.${index}.requiredByDate`}
                        type="date"
                        {...register(`equipment.${index}.requiredByDate`, {
                          required: "Required by date is required"
                        })}
                      />
                      {errors.equipment?.[index]?.requiredByDate && (
                        <p className="text-sm text-red-600">{errors.equipment[index]?.requiredByDate?.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`equipment.${index}.expectedReturnDate`}>Expected Return Date *</Label>
                      <Input
                        id={`equipment.${index}.expectedReturnDate`}
                        type="date"
                        {...register(`equipment.${index}.expectedReturnDate`, {
                          required: "Expected return date is required"
                        })}
                      />
                      {errors.equipment?.[index]?.expectedReturnDate && (
                        <p className="text-sm text-red-600">{errors.equipment[index]?.expectedReturnDate?.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

        <div className="pt-4">
          <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Owned Equipment Request"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}