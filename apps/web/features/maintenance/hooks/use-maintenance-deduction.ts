import { useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceService, CreateMaintenanceDeductionDto } from '../services/maintenance.service';

export function useCreateMaintenanceDeduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMaintenanceDeductionDto) => 
      maintenanceService.createMaintenanceDeduction(data),
    onSuccess: () => {
      // Invalidate both maintenance and accounting ledgers/summaries to reflect the new deduction
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
    },
  });
}
