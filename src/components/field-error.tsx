export function FieldError({ messages }: { messages?: string[] }) {
  return messages && messages.length > 0 ? <p className="error-text">{messages[0]}</p> : null;
}
