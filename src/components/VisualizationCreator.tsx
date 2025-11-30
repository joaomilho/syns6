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
  disabled?: boolean;
}

export default function VisualizationCreator({
  onGenerate,
  onSave,
  onCancel,
  isGenerating,
  hasCode,
  error,
  disabled = false,
}: VisualizationCreatorProps) {
  const [showNameInput, setShowNameInput] = useState(false);
  const [vizName, setVizName] = useState("");
  const [promptText, setPromptText] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (disabled) return;
    if (promptText.trim()) {
      onGenerate(promptText.trim());
      setPromptText(""); // Clear input after submitting
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
        <form onSubmit={handleSubmit} className={styles.form}>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            className={styles.textarea}
            placeholder={disabled ? "AI visualization generation coming soon..." : (hasCode ? "Refine your visualization... (e.g., 'make it faster', 'add more colors', 'increase size')" : "Describe your visualization...")}
            rows={4}
            disabled={isGenerating || disabled}
            required
          />
          
          <div className={styles.buttons}>
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
              disabled={isGenerating}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className={styles.generateButton}
              disabled={isGenerating || disabled}
            >
              {disabled ? "Coming Soon" : (isGenerating ? "Generating..." : hasCode ? "Improve" : "Generate")}
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
          </div>
        </form>
        
        {error && (
          <div className={styles.error}>
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {isGenerating && (
          <div className={styles.status}>
            {hasCode ? "Improving your visualization..." : "Generating your visualization..."}
          </div>
        )}
        
        {hasCode && !isGenerating && !showNameInput && (
          <div className={styles.hint}>
            💡 Try refining: "make it faster", "more colors", "bigger objects", "slower rotation", etc.
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

