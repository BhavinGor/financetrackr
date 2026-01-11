import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { FileText, ScanSearch, Sparkles, CheckCircle2 } from 'lucide-react';

interface LoadingStepProps {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    isCompleted: boolean;
}

const LoadingStep = ({ icon, label, isActive, isCompleted }: LoadingStepProps) => {
    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive ? 'bg-blue-50 border border-blue-100' : 'opacity-60'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isCompleted ? 'bg-green-500 text-white' :
                isActive ? 'bg-blue-600 text-white animate-pulse' :
                    'bg-slate-200 text-slate-400'
                }`}>
                {isCompleted ? <CheckCircle2 size={16} /> : icon}
            </div>
            <span className={`font-medium ${isActive ? 'text-blue-900' : 'text-slate-500'}`}>{label}</span>
            {isActive && <div className="ml-auto w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
        </div>
    );
};

interface PdfLoadingModalProps {
    isOpen: boolean;
    stage: 'uploading' | 'parsing' | 'ai_analysis' | 'complete';
}

export const PdfLoadingModal = ({ isOpen, stage }: PdfLoadingModalProps) => {
    return (
        <Modal isOpen={isOpen} onClose={() => { }} title="Processing Document" size="sm">
            <div className="space-y-4 py-4">
                <LoadingStep
                    icon={<FileText size={16} />}
                    label="Uploading PDF"
                    isActive={stage === 'uploading'}
                    isCompleted={stage !== 'uploading'}
                />
                <LoadingStep
                    icon={<ScanSearch size={16} />}
                    label="Reading Transactions"
                    isActive={stage === 'parsing'}
                    isCompleted={stage === 'ai_analysis' || stage === 'complete'}
                />
                <LoadingStep
                    icon={<Sparkles size={16} />}
                    label="Understanding with AI"
                    isActive={stage === 'ai_analysis'}
                    isCompleted={stage === 'complete'}
                />
            </div>
            <p className="text-center text-xs text-slate-400 mt-4">This usually takes 10-20 seconds...</p>
        </Modal>
    );
};
