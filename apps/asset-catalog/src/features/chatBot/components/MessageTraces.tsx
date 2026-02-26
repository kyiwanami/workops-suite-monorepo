import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import type { TraceStep } from "../types";

export function MessageTraces({ traces }: { traces: TraceStep[] }) {
  return (
    <Accordion sx={{ mt: 1, bgcolor: "rgba(255,255,255,0.7)" }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="caption">
          🔍 思考プロセス ({traces.length} steps)
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ maxHeight: 300, overflowY: "auto" }}>
        {traces.map((step, tIdx) => (
          <Box key={tIdx} sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {step.role}
            </Typography>

            {step.text && (
              <Typography
                variant="body2"
                sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}
              >
                {step.text}
              </Typography>
            )}

            {step.toolCalls.map((call) => (
              <Box
                key={call.toolUseId}
                sx={{
                  p: 1,
                  bgcolor: "white",
                  borderRadius: 1,
                  mt: 0.5,
                }}
              >
                <Typography variant="body2">🔧 Tool: {call.name}</Typography>
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{ fontSize: "0.65rem", mt: 0.5 }}
                >
                  {JSON.stringify(call.input, null, 2)}
                </Typography>
              </Box>
            ))}

            {step.toolResults.map((result) => (
              <Box
                key={result.toolUseId}
                sx={{
                  p: 1,
                  bgcolor: "white",
                  borderRadius: 1,
                  mt: 0.5,
                }}
              >
                <Typography variant="body2">
                  ✅ Result ({result.status})
                </Typography>

                {result.kbChunks && result.kbChunks.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="primary">
                      📚 検索結果: {result.kbChunks.length} 件
                    </Typography>
                    {result.kbChunks.map((chunk, idx) => (
                      <Accordion
                        key={idx}
                        sx={{
                          mt: 0.5,
                          bgcolor: "#fafafa",
                        }}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="caption">
                            {idx + 1}. スコア:{" "}
                            {chunk.score?.toFixed(3) ?? "N/A"}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography
                            variant="caption"
                            component="pre"
                            sx={{
                              whiteSpace: "pre-wrap",
                              fontSize: "0.7rem",
                              bgcolor: "#f5f5f5",
                              p: 1,
                              borderRadius: 1,
                            }}
                          >
                            {chunk.text}
                          </Typography>
                          {chunk.source && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                mt: 0.5,
                                display: "block",
                              }}
                            >
                              📄 {chunk.source}
                            </Typography>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        ))}
      </AccordionDetails>
    </Accordion>
  );
}
