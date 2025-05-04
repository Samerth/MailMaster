import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, CheckCircle } from "lucide-react";

const formSchema = z.object({
  notes: z.string().optional(),
  signature: z.string().optional(),
  photoConfirmation: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PickupConfirmationProps {
  open: boolean;
  onClose: () => void;
  mailItem?: {
    id: number;
    trackingNumber?: string;
    carrier: string;
    type: string;
    recipient: {
      id: number;
      firstName: string;
      lastName: string;
    };
  };
}

export default function PickupConfirmation({ open, onClose, mailItem }: PickupConfirmationProps) {
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [isCaptureActive, setIsCaptureActive] = useState(false);
  const [captureType, setCaptureType] = useState<'signature' | 'photo' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signaturePadRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: "",
      signature: "",
      photoConfirmation: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!mailItem) return null;
      
      const data = {
        mailItemId: mailItem.id,
        recipientId: mailItem.recipient.id,
        notes: values.notes,
        signature: signatureData,
        photoConfirmation: photoData,
      };
      
      const response = await apiRequest("POST", "/api/pickups", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pickup confirmed",
        description: "The pickup has been successfully recorded.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mail-items/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities/recent'] });
      form.reset();
      setSignatureData(null);
      setPhotoData(null);
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to confirm pickup. Please try again.",
        variant: "destructive",
      });
      console.error("Error confirming pickup:", error);
    },
  });

  const handleSubmit = (values: FormValues) => {
    if (!signatureData) {
      toast({
        title: "Signature required",
        description: "Please capture a signature before confirming pickup.",
        variant: "destructive",
      });
      return;
    }
    
    mutation.mutate(values);
  };

  const startSignatureCapture = () => {
    setIsCaptureActive(true);
    setCaptureType('signature');
    
    // In a real implementation, this would initialize a signature pad
    setTimeout(() => {
      // Simulate drawing a signature
      setSignatureData("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iNTAiPjxwYXRoIGQ9Ik0yMCwyMCBDNDAsMTAgODAsMTAgMTIwLDIwIEMxNDAsMjUgMTgwLDI1IDE5MCwxMCIgc3Ryb2tlPSJibGFjayIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+");
      setIsCaptureActive(false);
      setCaptureType(null);
    }, 1000);
  };

  const startPhotoCapture = () => {
    setIsCaptureActive(true);
    setCaptureType('photo');
    
    // Use file input for photo capture in this example
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setIsCaptureActive(false);
      setCaptureType(null);
      return;
    }
    
    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoData(e.target?.result as string);
      setIsCaptureActive(false);
      setCaptureType(null);
    };
    reader.readAsDataURL(file);
  };

  if (!mailItem) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            Confirm Pickup
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Item Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Recipient:</span>
                <span className="text-sm font-medium">{mailItem.recipient.firstName} {mailItem.recipient.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Item:</span>
                <span className="text-sm font-medium">{mailItem.carrier} {mailItem.type}</span>
              </div>
              {mailItem.trackingNumber && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Tracking:</span>
                  <span className="text-sm font-medium">{mailItem.trackingNumber}</span>
                </div>
              )}
            </div>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Signature Capture */}
              <div className="space-y-2">
                <FormLabel>Signature <Badge className="ml-1 bg-red-500">Required</Badge></FormLabel>
                {signatureData ? (
                  <div className="border rounded-md p-2 bg-white">
                    <div className="relative">
                      <img 
                        src={signatureData} 
                        alt="Signature" 
                        className="mx-auto h-20 object-contain"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute top-0 right-0"
                        onClick={() => setSignatureData(null)}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    ref={signaturePadRef}
                    className="border-2 border-dashed border-slate-300 rounded-md p-4 text-center h-24 flex items-center justify-center bg-white"
                  >
                    {isCaptureActive && captureType === 'signature' ? (
                      <div className="text-sm text-slate-500">
                        <svg className="animate-spin h-5 w-5 mx-auto mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Capturing signature...
                      </div>
                    ) : (
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={startSignatureCapture}
                      >
                        Capture Signature
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Photo Confirmation */}
              <div className="space-y-2">
                <FormLabel>Photo Confirmation <Badge className="ml-1 bg-slate-500">Optional</Badge></FormLabel>
                {photoData ? (
                  <div className="border rounded-md p-2 bg-white">
                    <div className="relative">
                      <img 
                        src={photoData} 
                        alt="Confirmation" 
                        className="mx-auto max-h-32 object-contain" 
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute top-0 right-0"
                        onClick={() => setPhotoData(null)}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-md p-4 text-center h-24 flex items-center justify-center bg-white">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileChange}
                      disabled={isCaptureActive}
                    />
                    {isCaptureActive && captureType === 'photo' ? (
                      <div className="text-sm text-slate-500">
                        <svg className="animate-spin h-5 w-5 mx-auto mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Preparing camera...
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={startPhotoCapture}
                          disabled={isCaptureActive}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Camera
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isCaptureActive}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter any additional notes" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={form.handleSubmit(handleSubmit)} 
            disabled={mutation.isPending || isCaptureActive || !signatureData}
          >
            {mutation.isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              "Confirm Pickup"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
