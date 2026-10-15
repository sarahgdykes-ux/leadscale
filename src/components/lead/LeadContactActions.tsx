export function LeadContactActions({
  name,
  email,
  phone,
}: {
  name: string;
  email?: string;
  phone?: string;
}) {
  if (!email && !phone) return null;

  return (
    <section className="lead-contact-actions" aria-label="Contact client">
      {email ? (
        <a
          className="button button--primary button--small"
          href={`mailto:${encodeURIComponent(email)}`}
          aria-label={`Email ${name}`}
        >
          Email client
        </a>
      ) : null}
      {phone ? (
        <a
          className="button button--secondary button--small"
          href={`tel:${encodeURIComponent(phone)}`}
          aria-label={`Call ${name}`}
        >
          Call client
        </a>
      ) : null}
    </section>
  );
}
