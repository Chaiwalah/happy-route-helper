
import { useToast as useHookToast, toast as hookToast } from "@/hooks/use-toast";

// Re-export the toast hook with enhanced logging
export const useToast = () => {
  const hookResult = useHookToast();
  return hookResult;
};

// Enhanced toast function with logging
export const toast = (props: Parameters<typeof hookToast>[0]) => {
  // Log toast messages for debugging
  console.log('[Toast]', props);
  return hookToast(props);
};
