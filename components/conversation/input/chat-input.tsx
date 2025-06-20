'use client';

import React, { ReactNode, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';
import { deleteCookie, getCookie, setCookie } from 'cookies-next';
import { CheckCircle as LuCheckCircle, UploadCloud, Loader2, ChevronDown } from 'lucide-react';
import { LuPaperclip, LuSend, LuArrowUp, LuLoader as LuLoaderIcon, LuTrash2 } from 'react-icons/lu';

import { useInteractiveConfig } from '@/components/interactive/InteractiveConfigContext';
import { useCompany } from '@/components/interactive/useUser';
import { VoiceRecorder } from '@/components/conversation/input/VoiceRecorder';
import { Textarea } from '@/components/ui/textarea';
import { DropZone } from '@/components/conversation/input/DropZone';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/layout/toast';

// Child-friendly voice recorder with large button
const ChildFriendlyVoiceRecorder = ({
  onSend,
  disabled,
}: {
  onSend: (message: string | object, uploadedFiles?: { [x: string]: string }) => Promise<void>;
  disabled: boolean;
}) => {
  return (
    <div className='flex items-center justify-center space-x-4'>
      <div className='text-center'>
        <p className='text-lg font-semibold text-primary'>
          <span role='img' aria-label='microphone'>
            🎤
          </span>{' '}
          Tap to talk!
        </p>
      </div>

      {/* Larger microphone button that fits in chat bar */}
      <div className='relative'>
        {/* Custom styling to make VoiceRecorder button larger but appropriate for chat bar */}
        <style jsx>{`
          :global(.child-voice-recorder button) {
            width: 60px !important;
            height: 60px !important;
            border-radius: 50% !important;
            background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%) !important;
            box-shadow:
              0 10px 15px -3px rgba(0, 0, 0, 0.1),
              0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
            transition: all 0.3s ease !important;
          }
          :global(.child-voice-recorder button:hover) {
            transform: scale(1.1) !important;
            box-shadow:
              0 20px 25px -5px rgba(0, 0, 0, 0.1),
              0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
          }
          :global(.child-voice-recorder button:active) {
            transform: scale(0.95) !important;
          }
          :global(.child-voice-recorder button svg) {
            width: 30px !important;
            height: 30px !important;
            color: white !important;
          }
        `}</style>
        <div className='child-voice-recorder'>
          <VoiceRecorder onSend={onSend} disabled={disabled} />
        </div>
      </div>
    </div>
  );
};

// Support components
export function OverrideSwitch({ name, label }: { name: string; label: string }): React.JSX.Element {
  const [state, setState] = useState<boolean | null>(
    getCookie('agixt-' + name) === undefined ? null : getCookie('agixt-' + name) !== 'false',
  );

  useEffect(() => {
    if (state === null) {
      deleteCookie('agixt-' + name, { domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN });
    } else {
      setCookie('agixt-' + name, state.toString(), {
        domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
        maxAge: 2147483647,
      });
    }
  }, [state, name]);

  return (
    <div className='flex flex-col items-center gap-1'>
      <span className='text-lg'>{label}</span>
      <div className='flex items-center gap-2'>
        <Checkbox checked={state === null} onClick={() => setState((old) => (old === null ? false : null))} />
        <p>Use Default</p>
      </div>
      {state !== null && (
        <div className='flex flex-row items-center space-x-2' title={label}>
          <p>{state === null ? null : state ? 'Allowed' : 'Never'}</p>
          <Switch id={label} checked={state} onClick={() => setState((old) => !old)} />
        </div>
      )}
    </div>
  );
}

export const Timer = ({ loading, timer }: { loading: boolean; timer: number }) => {
  const tooltipMessage = loading
    ? `Your most recent interaction has been underway (including all activities) for ${(timer / 10).toFixed(1)} seconds.`
    : `Your last interaction took ${(timer / 10).toFixed(1)} seconds to completely resolve.`;

  return (
    <div className='flex items-center space-x-1' title={tooltipMessage}>
      <span className='text-sm'>{(timer / 10).toFixed(1)}s</span>
      {loading ? <LuLoaderIcon className='animate-spin' /> : <LuCheckCircle className='text-green-500' />}
    </div>
  );
};

export const OverrideSwitches = ({ showOverrideSwitches }: { showOverrideSwitches: string }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size='icon' variant='ghost' className='rounded-full'>
          <LuArrowUp className='w-5 h-5' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-56'>
        <div className='space-y-4'>
          {showOverrideSwitches.split(',').includes('tts') && <OverrideSwitch name='tts' label='Text-to-Speech' />}
          {showOverrideSwitches.split(',').includes('websearch') && <OverrideSwitch name='websearch' label='Websearch' />}
          {showOverrideSwitches.split(',').includes('create-image') && (
            <OverrideSwitch name='create-image' label='Generate an Image' />
          )}
          {showOverrideSwitches.split(',').includes('analyze-user-input') && (
            <OverrideSwitch name='analyze-user-input' label='Analyze' />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const UploadFiles = ({
  handleUploadFiles,
  disabled,
}: {
  handleUploadFiles: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}) => {
  return (
    <div className='inline-flex'>
      <Button
        size='icon'
        variant='ghost'
        className='rounded-full'
        onClick={() => document.getElementById('file-upload')?.click()}
        disabled={disabled}
        title='Upload Files'
      >
        <LuPaperclip className='w-5 h-5 ' />
      </Button>
      <label id='trigger-file-upload' htmlFor='file-upload' className='hidden'>
        Upload files
      </label>
      <input id='file-upload' type='file' multiple className='hidden' onChange={handleUploadFiles} disabled={disabled} />
    </div>
  );
};

export const SendMessage = ({
  handleSend,
  message,
  uploadedFiles,
  disabled,
}: {
  handleSend: (message: string, uploadedFiles: { [x: string]: string }) => void;
  message: string;
  uploadedFiles: { [x: string]: string };
  disabled: boolean;
}) => {
  return (
    <div className='inline-flex'>
      <Button
        id='send-message'
        onClick={(event) => {
          event.preventDefault();
          handleSend(message, uploadedFiles);
        }}
        disabled={(message.trim().length === 0 && Object.keys(uploadedFiles).length === 0) || disabled}
        size='icon'
        variant='ghost'
        className='rounded-full'
        title='Send Message'
      >
        <LuSend className='w-5 h-5' />
      </Button>
    </div>
  );
};

export const ResetConversation = () => {
  const interactiveConfig = useInteractiveConfig();

  const handleReset = useCallback(() => {
    const uuid = crypto.randomUUID();
    setCookie('uuid', uuid, { domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN, maxAge: 2147483647 });

    if (interactiveConfig?.mutate) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      interactiveConfig.mutate((oldState: any) => ({
        ...oldState,
        overrides: { ...oldState.overrides, conversation: '-' },
      }));

      // Invalidate any cached conversation data
      mutate('/conversation/-');
    }
  }, [interactiveConfig]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline' size='icon'>
          <LuTrash2 className='w-4 h-4' />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Conversation</DialogTitle>
          <DialogDescription>Are you sure you want to reset the conversation? This cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleReset}>Reset</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const ListUploadedFiles = ({
  uploadedFiles,
  setUploadedFiles,
}: {
  uploadedFiles: { [x: string]: string };
  setUploadedFiles: React.Dispatch<React.SetStateAction<{ [x: string]: string }>>;
}): ReactNode => {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <span className='text-sm text-muted-foreground'>Uploaded Files:</span>
      {Object.entries(uploadedFiles).map(([fileName]) => (
        <Badge
          key={fileName}
          variant='outline'
          className='py-1 cursor-pointer bg-muted'
          onClick={() => {
            setUploadedFiles((prevFiles) => {
              const newFiles = { ...prevFiles };
              delete newFiles[String(fileName)];
              return newFiles;
            });
          }}
        >
          {fileName}
        </Badge>
      ))}
    </div>
  );
};

export function useDynamicInput(initialValue = '', uploadedFiles: { [x: string]: string }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !isActive) return;
    const adjustHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    };
    textarea.addEventListener('input', adjustHeight);
    adjustHeight();
    return () => textarea.removeEventListener('input', adjustHeight);
  }, [isActive]);

  useEffect(() => {
    if (Object.keys(uploadedFiles).length > 0) {
      setIsActive(true);
    }
  }, [uploadedFiles]);

  const handleFocus = () => {
    setIsActive(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleBlur = () => {
    setValue('');
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'unset';
    }
  };

  return { textareaRef, isActive, setIsActive, handleFocus, handleBlur, value, setValue };
}

const IMPORT_ERROR = 'Import Error';

export const ImportConversation = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button>>(
  (props, ref) => {
    const interactiveConfig = useInteractiveConfig();
    const router = useRouter();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isProcessingImport, setIsProcessingImport] = useState(false);

    const handleImportFile = useCallback(
      async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) {
          return;
        }
        if (!interactiveConfig || !interactiveConfig.agixt) {
          toast({ title: 'Error', description: 'SDK not available.', variant: 'destructive' });
          return;
        }

        setIsProcessingImport(true);
        const file = event.target.files[0];
        const fileName = file.name.replace(/\.[^/.]+$/, '');

        try {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const fileContentString = e.target?.result as string;
              if (!fileContentString) {
                throw new Error('File content is empty or could not be read.');
              }

              let content;
              try {
                content = JSON.parse(fileContentString);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } catch (parseError: any) {
                toast({
                  title: IMPORT_ERROR,
                  description: `Failed to parse JSON file: ${parseError.message}`,
                  variant: 'destructive',
                });
                setIsProcessingImport(false);
                if (event.target) event.target.value = '';
                return;
              }

              let baseNameForConv = fileName;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let messagesToProcess: any[] = [];

              if (Array.isArray(content)) {
                messagesToProcess = content;
              } else if (typeof content === 'object' && content !== null) {
                baseNameForConv = content.name || fileName;
                if (content.messages && Array.isArray(content.messages)) {
                  messagesToProcess = content.messages;
                } else if (content.conversation_history && Array.isArray(content.conversation_history)) {
                  messagesToProcess = content.conversation_history;
                }
              }

              if (messagesToProcess.length === 0) {
                throw new Error('No valid conversation messages found in the imported file.');
              }

              const timestamp = new Date().toISOString().split('.')[0].replace(/:/g, '-');
              const uniqueConversationName = `${baseNameForConv}_imported_${timestamp}`;

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const conversationContent = messagesToProcess
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((msg: any) => {
                  if (!msg || typeof msg !== 'object') {
                    return null;
                  }
                  const role = msg.role || 'user';
                  const messageText = msg.message || msg.content || '';
                  const ts = msg.timestamp || new Date().toISOString();
                  return { role, message: messageText, timestamp: ts };
                })
                .filter((msg) => msg !== null);

              if (conversationContent.length === 0) {
                throw new Error('No valid conversation messages after processing.');
              }

              const agentName = getCookie('agixt-agent') || process.env.NEXT_PUBLIC_AGIXT_AGENT || 'AGiXT';
              const newConversation = await interactiveConfig.agixt.newConversation(
                agentName,
                uniqueConversationName,
                conversationContent,
              );
              const newConversationID = newConversation.id || '-';

              await mutate('/conversations');

              if (interactiveConfig.mutate) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                interactiveConfig.mutate((oldState: any) => ({
                  ...oldState,
                  overrides: { ...oldState?.overrides, conversation: newConversationID },
                }));
              }

              router.push(`/chat/${newConversationID}`);
              toast({
                title: 'Success',
                description: `Conversation "${uniqueConversationName}" imported successfully.`,
              });
              setIsDialogOpen(false);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
              toast({
                title: IMPORT_ERROR,
                description: `Failed to process file: ${error.message}`,
                variant: 'destructive',
              });
            } finally {
              setIsProcessingImport(false);
            }
          };
          reader.onerror = () => {
            toast({ title: IMPORT_ERROR, description: 'Error reading file.', variant: 'destructive' });
            setIsProcessingImport(false);
          };
          reader.readAsText(file);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          toast({ title: 'Error', description: 'Failed to import conversation', variant: 'destructive' });
          setIsProcessingImport(false);
        }
        if (event.target) event.target.value = '';
      },
      [interactiveConfig, router],
    );

    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <div className='inline-flex'>
            <Button
              ref={ref}
              size='icon'
              variant='ghost'
              className='rounded-full'
              onClick={() => setIsDialogOpen(true)}
              disabled={isProcessingImport}
              title='Import Conversation'
              {...props}
            >
              <UploadCloud className='w-5 h-5' />
            </Button>
          </div>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Conversation</DialogTitle>
            <DialogDescription>Import a conversation from a JSON file.</DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div className='grid w-full max-w-sm items-center gap-1.5'>
              <Label htmlFor='chat-bar-import-file'>Choose conversation file (.json)</Label>
              <Input
                id='chat-bar-import-file'
                type='file'
                accept='.json'
                onChange={handleImportFile}
                disabled={isProcessingImport}
              />
            </div>
            {isProcessingImport && (
              <div className='flex items-center justify-center text-muted-foreground'>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Processing import...
              </div>
            )}
            <p className='text-sm text-muted-foreground'>Select a JSON file containing conversation data to import.</p>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsDialogOpen(false)} disabled={isProcessingImport}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);

ImportConversation.displayName = 'ImportConversation';

export function ChatBar({
  onSend,
  disabled,
  loading,
  clearOnSend = true,
  blurOnSend = true,
  enableFileUpload = false,
  enableVoiceInput = false,
  showResetConversation = false,
  isEmptyConversation = false,
}: {
  onSend: (message: string | object, uploadedFiles?: { [x: string]: string }) => Promise<string>;
  disabled: boolean;
  loading: boolean;
  clearOnSend?: boolean;
  blurOnSend?: boolean;
  enableFileUpload?: boolean;
  enableVoiceInput?: boolean;
  showResetConversation?: boolean;
  isEmptyConversation?: boolean;
}): ReactNode {
  const [uploadedFiles, setUploadedFiles] = useState<{ [x: string]: string }>({});
  const { data: company } = useCompany();
  const isChild = company?.roleId === 4;

  const {
    textareaRef,
    isActive,
    handleFocus,
    handleBlur,
    value: message,
    setValue: setMessage,
    setIsActive,
  } = useDynamicInput('', uploadedFiles);

  const handleUploadFiles = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (event.target.files) {
      for (const file of event.target.files) {
        await uploadFile(file);
      }
    }
  };

  const uploadFile = async (file: File) => {
    const newUploadedFiles: { [x: string]: string } = {};
    const fileContent = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = (): void => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    newUploadedFiles[file.name] = fileContent;
    setUploadedFiles((previous) => ({ ...previous, ...newUploadedFiles }));
  };

  const handleSendMessage = useCallback(() => {
    if (blurOnSend) {
      handleBlur();
    }
    if (message.trim().length > 0 || Object.keys(uploadedFiles).length > 0) {
      onSend(message, uploadedFiles);
      if (clearOnSend) {
        setMessage('');
        setUploadedFiles({});
      }
    }
  }, [message, uploadedFiles, blurOnSend, handleBlur, onSend, clearOnSend, setMessage]);

  // Wrapper function for VoiceRecorder compatibility
  const handleVoiceSend = async (message: string | object, uploadedFiles?: { [x: string]: string }) => {
    await onSend(message, uploadedFiles);
  };

  // Simple voice-only interface for children (roleId 4)
  if (isChild) {
    return (
      <div
        className={cn(
          'flex absolute bg-background bottom-0 items-center justify-center left-0 right-0 max-w-[95%] px-2 py-3 m-3 mx-auto border overflow-hidden shadow-md rounded-3xl',
        )}
      >
        <ChildFriendlyVoiceRecorder onSend={handleVoiceSend} disabled={disabled} />
      </div>
    );
  }

  return (
    <DropZone
      onUpload={(files: File[]) => files.map((file) => uploadFile(file))}
      className={cn(
        'flex absolute bg-background bottom-0 items-center left-0 right-0 max-w-[95%] px-2 m-3 mx-auto border overflow-hidden shadow-md rounded-3xl',
        isActive && 'flex-col p-1',
      )}
    >
      {isActive ? (
        <label className='w-full' htmlFor='chat-message-input-active'>
          <div className='w-full'>
            <Textarea
              ref={textareaRef}
              placeholder={loading ? 'Sending...' : 'Enter your message here...'}
              className='overflow-x-hidden overflow-y-auto border-none resize-none min-h-4 ring-0 focus-visible:ring-0 max-h-96'
              rows={1}
              name='message'
              id='chat-message-input-active'
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={async (event) => {
                if (event.key === 'Enter' && !event.shiftKey && message.trim()) {
                  event.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={disabled}
            />
          </div>
          <div className='flex items-center w-full gap-1'>
            {enableFileUpload && <UploadFiles handleUploadFiles={handleUploadFiles} disabled={disabled} />}
            {isEmptyConversation && <ImportConversation />}
            {Object.keys(uploadedFiles).length > 0 && (
              <ListUploadedFiles uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles} />
            )}
            <div className='flex-grow' />
            <Button
              size='icon'
              variant='ghost'
              className='rounded-full'
              onClick={() => setIsActive(false)}
              title='Collapse Input'
            >
              <ChevronDown className='w-4 w-4' />
            </Button>
            {enableVoiceInput && <VoiceRecorder onSend={handleVoiceSend} disabled={disabled} />}
            {showResetConversation && <ResetConversation />}
            <SendMessage
              handleSend={handleSendMessage}
              message={message}
              uploadedFiles={uploadedFiles}
              disabled={disabled}
            />
          </div>
        </label>
      ) : (
        <>
          {enableFileUpload && <UploadFiles handleUploadFiles={handleUploadFiles} disabled={disabled} />}
          {isEmptyConversation && <ImportConversation />}
          <Button
            id='chat-message-input-inactive'
            size='lg'
            role='textbox'
            variant='ghost'
            className='justify-start w-full px-4 hover:bg-transparent'
            onClick={handleFocus}
          >
            <span className='font-light text-muted-foreground'>{loading ? 'Sending...' : 'Enter your message here...'}</span>
          </Button>
          {enableVoiceInput && <VoiceRecorder onSend={handleVoiceSend} disabled={disabled} />}
        </>
      )}
    </DropZone>
  );
}
