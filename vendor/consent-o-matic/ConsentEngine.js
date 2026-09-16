// Cookie Calm compatibility bridge. The six adjacent modules are unmodified upstream files.
// Scheduling, cancellation, consent guards, and UI live in src/.
export default class ConsentEngine {
  static singleton = null;
  static debugValues = { skipHideMethod: true };
  static generalSettings = { hideInsteadOfPIP: true };
  static topFrameUrl = '';
}
