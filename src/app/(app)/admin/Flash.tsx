export function Flash({ error, message }: { error?: string; message?: string }) {
  return (
    <>
      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-ok">{message}</div>}
    </>
  );
}
