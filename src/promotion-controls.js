// Shared by structural discovery and action selection. Links without href can
// be native controls; links that navigate remain ineligible for dismissal.
export const PROMOTION_CONTROLS = 'button, [role="button"], a:not([href])';
export const CLOSE = /^(close|dismiss|minimi[sz]e|collapse)( (this|the))?( (banner|popup|pop-up|dialog|modal|offer|promotion|newsletter|subscription prompt|sign-in gate|registration (prompt|wall|dialog)|chat|messenger|video|player|survey|window))?$|^hide (this |the )?(banner|popup|pop-up|offer|chat)$|^[×✕✖]$/;
export const DECLINE = /^(no[, ]+thanks|no[, ]+thank you|not now|maybe later|continue without (subscribing|signing up|support)|skip (this |the )?(offer|signup|sign-up|survey))$/;
export const ADBLOCK_REQUEST = /\b(disable|turn off|pause) (your |the |an? )?ad[ -]?block(er|ing)?\b/i;
// Discovery only. This label is actionable solely under the offer-teaser contract.
export const TEASER_CLOSE = /^close teaser$/;
export const TEASER_CONTROLS = 'button[aria-label="Close teaser" i],button[title="Close teaser" i]';
