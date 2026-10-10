import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from "react-email";

// Sent to the visitor with the PDF attached. It goes to an address someone
// typed into a public form, so it carries no text the visitor wrote: the
// figures are computed server-side and everything else is fixed copy.

export interface OpsLeakBreakdownEmailProps {
  /** e.g. "£3,100 to £5,200 a month" */
  range: string;
  auditUrl: string;
}

export default function OpsLeakBreakdownEmail({ range, auditUrl }: OpsLeakBreakdownEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Your Ops Leak estimate: ${range}`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>Your Ops Leak estimate</Heading>
          <Section>
            <Text style={lead}>{range}</Text>
            <Text style={text}>
              The breakdown is attached as a PDF: each leak with its hours and cost, your top three, and what
              the audit would count instead. It is worked out from the numbers you entered, so treat it as an
              estimate.
            </Text>
            <Text style={text}>
              If you want the hours counted rather than estimated, that is the Ops Leak Audit, $3,500 fixed for
              one team.{" "}
              <Link href={auditUrl} style={link}>
                See how it works
              </Link>
              .
            </Text>
            <Text style={text}>You asked for this one email. You are not on a list.</Text>
            <Text style={sign}>Qamar, Gravixar</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = { backgroundColor: "#ffffff", color: "#18181b", fontFamily: "Helvetica, Arial, sans-serif" };
const container = { margin: "0 auto", padding: "32px 20px", maxWidth: "560px" };
const h1 = { color: "#18181b", fontSize: "20px", fontWeight: 600, margin: "0 0 12px" };
const lead = { color: "#18181b", fontSize: "24px", fontWeight: 700, margin: "0 0 16px" };
const text = { color: "#3f3f46", fontSize: "15px", lineHeight: "1.6", margin: "0 0 14px" };
const link = { color: "#e5532a" };
const sign = { color: "#18181b", fontSize: "15px", margin: "20px 0 0" };
