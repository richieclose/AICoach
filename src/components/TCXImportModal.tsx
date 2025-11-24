import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle, XCircle } from 'lucide-react';
import { parseTCX } from '@/lib/workout/tcxParser';
import { importTCXWorkouts } from '@/app/actions/workout';

interface TCXImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete?: () => void;
}

export function TCXImportModal({ isOpen, onClose, onImportComplete }: TCXImportModalProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [result, setResult] = useState<{ success: number; failed: number; error?: string } | null>(null);
    const [errors, setErrors] = useState<string[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
            setResult(null);
            setErrors([]);
        }
    };

    const handleClose = () => {
        setFiles([]);
        setResult(null);
        setErrors([]);
        onClose();
    };

    const handleImport = async () => {
        if (files.length === 0) return;

        setIsImporting(true);
        setErrors([]);
        try {
            const parsedWorkouts = [];
            const newErrors: string[] = [];

            for (const file of files) {
                const content = await file.text();
                const result = parseTCX(content);

                if (result.success) {
                    parsedWorkouts.push({
                        name: result.data.name,
                        startTime: result.data.startTime.getTime(),
                        endTime: result.data.endTime.getTime(),
                        dataPoints: result.data.dataPoints
                    });
                } else {
                    newErrors.push(`${file.name}: ${result.error}`);
                }
            }

            if (parsedWorkouts.length > 0) {
                const importResult = await importTCXWorkouts(parsedWorkouts);
                setResult(importResult);

                if (importResult.success > 0 && onImportComplete) {
                    onImportComplete();
                }
            } else {
                setResult({ success: 0, failed: files.length });
            }

            if (newErrors.length > 0) {
                setErrors(newErrors);
            }
        } catch (error) {
            console.error('Import error:', error);
            setResult({ success: 0, failed: files.length });
            setErrors(['Unexpected error during import']);
        } finally {
            setIsImporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Upload className="w-5 h-5 text-primary" />
                        Import TCX Files
                    </h2>
                    <button onClick={handleClose} className="text-muted-foreground hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    {!result ? (
                        <>
                            <p className="text-sm text-muted-foreground">
                                Import workout history from Garmin, Wahoo, or other platforms.
                            </p>

                            <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                                <input
                                    type="file"
                                    accept=".tcx"
                                    multiple
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="tcx-upload"
                                />
                                <label htmlFor="tcx-upload" className="cursor-pointer">
                                    <FileText className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                                    <p className="text-sm font-medium">Click to select TCX files</p>
                                    <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
                                </label>
                            </div>

                            {files.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">{files.length} file(s) selected:</p>
                                    <div className="max-h-32 overflow-y-auto space-y-1">
                                        {files.map((file, idx) => (
                                            <div key={idx} className="text-xs text-muted-foreground bg-secondary/10 px-2 py-1 rounded">
                                                {file.name}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleImport}
                                disabled={files.length === 0 || isImporting}
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                            >
                                {isImporting ? 'Importing...' : 'Import Workouts'}
                            </button>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                    <p className="font-semibold">{result.success} workouts imported successfully</p>
                                </div>
                                {result.failed > 0 && (
                                    <div className="flex items-center gap-2">
                                        <XCircle className="w-5 h-5 text-red-500" />
                                        <p className="text-sm text-muted-foreground">{result.failed} failed to import</p>
                                    </div>
                                )}
                                {result.error && (
                                    <div className="flex items-center gap-2">
                                        <XCircle className="w-5 h-5 text-red-500" />
                                        <p className="text-sm text-red-500">{result.error}</p>
                                    </div>
                                )}
                            </div>

                            {errors.length > 0 && (
                                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl max-h-40 overflow-y-auto">
                                    <p className="font-semibold text-red-500 mb-2 text-sm">Errors:</p>
                                    <ul className="space-y-1">
                                        {errors.map((err, idx) => (
                                            <li key={idx} className="text-xs text-red-400">{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button
                                onClick={handleClose}
                                className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium py-2 rounded-xl transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
