"use client";

import { useState } from "react";
import styles from "./VisualizationCreator.module.css";

interface VisualizationCreatorProps {
  onGenerate: (prompt: string) => void;
  onSave: (name: string) => Promise<void> | void;
  onCancel: () => void;
  isGenerating: boolean;
  hasCode: boolean;
  error: string | null;
}

export default function VisualizationCreator({
  onGenerate,
  onSave,
  onCancel,
  isGenerating,
  hasCode,
  error,
}: VisualizationCreatorProps) {
  const [showNameInput, setShowNameInput] = useState(false);
  const [vizName, setVizName] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const promptText = formData.get("prompt") as string;
    if (promptText.trim()) {
      onGenerate(promptText.trim());
    }
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowNameInput(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (vizName.trim()) {
      const cleanName = vizName.trim();
      setShowNameInput(false);
      setVizName("");
      onSave(cleanName);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <h2 className={styles.title}>Create Your Own Visualization</h2>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <textarea
            name="prompt"
            className={styles.textarea}
            placeholder="Describe your visualization... (e.g., 'A spinning cube that pulses with the bass')"
            rows={4}
            disabled={isGenerating}
            required
          />
          
          <div className={styles.buttons}>
            <button
              type="submit"
              className={styles.generateButton}
              disabled={isGenerating || hasCode}
            >
              {isGenerating ? "Generating..." : hasCode ? "Generated ✓" : "Generate"}
            </button>
            
            {hasCode && !showNameInput && (
              <button
                type="button"
                onClick={handleSaveClick}
                className={styles.saveButton}
                disabled={isGenerating}
              >
                Save & Use
              </button>
            )}
            
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
              disabled={isGenerating}
            >
              Cancel
            </button>
          </div>
        </form>
        
        {error && (
          <div className={styles.error}>
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {isGenerating && (
          <div className={styles.status}>
            Generating your visualization...
          </div>
        )}
        
        {showNameInput && (
          <form onSubmit={handleSaveSubmit} className={styles.nameForm}>
            <input
              type="text"
              value={vizName}
              onChange={(e) => setVizName(e.target.value)}
              placeholder="Enter visualization name..."
              className={styles.nameInput}
              autoFocus
              required
            />
            <div className={styles.nameButtons}>
              <button type="submit" className={styles.confirmButton}>
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNameInput(false);
                  setVizName("");
                }}
                className={styles.cancelNameButton}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

