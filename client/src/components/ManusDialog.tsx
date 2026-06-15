import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

interface ManusDialogProps {
  title?: string;
  logo?: string;
  open?: boolean;
  onLogin: () => void;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function ManusDialog({
  title,
  logo,
  open = false,
  onLogin,
  onOpenChange,
  onClose,
}: ManusDialogProps) {
  const [internalOpen, setInternalOpen] = useState(open);

  useEffect(() => {
    if (!onOpenChange) {
      setInternalOpen(open);
    }
  }, [open, onOpenChange]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }

    if (!nextOpen) {
      onClose?.();
    }
  };

  return (
    <Dialog
      open={onOpenChange ? open : internalOpen}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="py-5 bg-background rounded-2xl w-[400px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-[--color-gold]/[0.1] backdrop-blur-2xl p-0 gap-0 text-center">
        <div className="flex flex-col items-center gap-2 p-5 pt-12">
          {logo ? (
            <div className="w-16 h-16 bg-background rounded-xl border border-[--color-gold]/[0.1] flex items-center justify-center">
              <img
                src={logo}
                alt="Dialog graphic"
                className="w-10 h-10 rounded-md"
              />
            </div>
          ) : null}

          {/* Title and subtitle */}
          {title ? (
            <DialogTitle className="text-xl font-semibold text-white leading-[26px] tracking-[-0.44px]">
              {title}
            </DialogTitle>
          ) : null}
          <DialogDescription className="text-sm text-[--color-silver-dark]/50 leading-5 tracking-[-0.154px]">
            Please sign in to continue
          </DialogDescription>
        </div>

        <DialogFooter className="px-5 py-5">
          {/* Login button */}
          <Button
            onClick={onLogin}
            className="btn-primary btn-sheen btn-sheen w-full h-10 rounded-xl text-sm font-medium leading-5 tracking-[-0.154px]"
          >
            Sign in to WIZ AI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
