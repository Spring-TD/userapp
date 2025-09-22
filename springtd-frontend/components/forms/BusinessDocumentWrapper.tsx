"use client";

import React, { useState } from "react";
import BusinessDocument from "./BusinessDocument";
import BusinessDocumentWithError from "./BusinessDocumentError";

const BusinessDocumentWrapper: React.FC = () => {
  const [hasError, setHasError] = useState(false);

  const handleContinue = () => {
    // simulate backend validation -> show error version
    setHasError(true);
  };

  return (
    <>
      {!hasError ? (
        <BusinessDocument onContinue={handleContinue} />
      ) : (
        <BusinessDocumentWithError />
      )}
    </>
  );
};

export default BusinessDocumentWrapper;
