import { useEffect } from "react";

/**
 * Hook to set the document title
 * @param title The title to set for the document
 * @param includeSuffix Whether to include the app name suffix (defaults to true)
 */
export function useDocumentTitle(title: string, includeSuffix = true) {
  useEffect(() => {
    const suffix = includeSuffix ? " - MailFlow" : "";
    document.title = title + suffix;
    
    // Restore the original title when the component unmounts
    return () => {
      document.title = "MailFlow - Mailroom Management Platform";
    };
  }, [title, includeSuffix]);
}
