import { Loader2, AlertCircle } from 'lucide-react';

export const LoadingIndicator = () => (
  <div className="flex-grow flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Se încarcă orarul...</p>
      </div>
  </div>
);

export const ErrorDisplay = ({ error }: { error: string | null }) => (
  <div className="flex-grow flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-destructive bg-destructive/10 p-4 rounded-lg">
          <AlertCircle className="h-8 w-8" />
          <p className="text-center max-w-xs">{error}</p>
      </div>
  </div>
);
