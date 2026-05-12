import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface ServiceInquiryEmailProps {
  name: string;
  email: string;
  company?: string;
  message: string;
  sourcePage: string;
  source?: string;
  receivedAt: string;
}

export default function ServiceInquiryEmail({
  name,
  email,
  company,
  message,
  sourcePage,
  source,
  receivedAt,
}: ServiceInquiryEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Service inquiry — ${sourcePage} — ${name}`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>Service inquiry</Heading>
          <Section style={section}>
            <Text style={label}>Service page</Text>
            <Text style={pageStyle}>{sourcePage}</Text>
            <Text style={label}>From</Text>
            <Text style={value}>
              {name} &lt;{email}&gt;
            </Text>
            {company ? (
              <>
                <Text style={label}>Company</Text>
                <Text style={value}>{company}</Text>
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
            <Text style={label}>Message</Text>
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
const pageStyle = { color: "#a78bfa", fontSize: "14px", fontFamily: "ui-monospace, monospace", margin: "0" };
const messageStyle = { color: "#e4e4e7", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-wrap" as const, margin: "8px 0 0" };
const hr = { borderColor: "#27272a", margin: "16px 0" };
