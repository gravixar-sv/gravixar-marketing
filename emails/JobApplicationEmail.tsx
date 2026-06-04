import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface JobApplicationEmailProps {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
  sourcePage: string;
  link?: string;
  cvUrl?: string;
  source?: string;
  receivedAt: string;
}

export default function JobApplicationEmail({
  name,
  email,
  phone,
  company,
  message,
  sourcePage,
  link,
  cvUrl,
  source,
  receivedAt,
}: JobApplicationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Job application — ${sourcePage} — ${name}`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>Job application</Heading>
          <Section style={section}>
            <Text style={label}>Role</Text>
            <Text style={pageStyle}>{sourcePage}</Text>
            <Text style={label}>From</Text>
            <Text style={value}>
              {name} &lt;{email}&gt;
            </Text>
            {phone ? (
              <>
                <Text style={label}>Phone</Text>
                <Text style={value}>{phone}</Text>
              </>
            ) : null}
            {company ? (
              <>
                <Text style={label}>Current employer</Text>
                <Text style={value}>{company}</Text>
              </>
            ) : null}
            {link ? (
              <>
                <Text style={label}>LinkedIn / portfolio</Text>
                <Link href={link} style={linkStyle}>
                  {link}
                </Link>
              </>
            ) : null}
            {cvUrl ? (
              <>
                <Text style={label}>CV</Text>
                <Link href={cvUrl} style={linkStyle}>
                  Download CV
                </Link>
              </>
            ) : null}
            {source ? (
              <>
                <Text style={label}>Source</Text>
                <Text style={value}>{source}</Text>
              </>
            ) : null}
            <Text style={label}>Received</Text>
            <Text style={value}>{receivedAt}</Text>
          </Section>
          <Hr style={hr} />
          <Section style={section}>
            <Text style={label}>Why this role</Text>
            <Text style={messageStyle}>{message}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = { backgroundColor: "#0a0a0a", color: "#fafafa", fontFamily: "Inter, system-ui, sans-serif" };
const container = { margin: "0 auto", padding: "32px 20px", maxWidth: "640px" };
const h1 = { color: "#ff6b35", fontSize: "20px", fontWeight: 600, margin: "0 0 16px" };
const section = { padding: "8px 0" };
const label = { color: "#71717a", fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "12px 0 2px" };
const value = { color: "#fafafa", fontSize: "14px", margin: "0" };
const pageStyle = { color: "#22d3ee", fontSize: "14px", fontFamily: "ui-monospace, monospace", margin: "0" };
const linkStyle = { color: "#22d3ee", fontSize: "14px", margin: "0", wordBreak: "break-all" as const };
const messageStyle = { color: "#e4e4e7", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-wrap" as const, margin: "8px 0 0" };
const hr = { borderColor: "#27272a", margin: "16px 0" };
