import {label, visible} from './dom.js';

const EXPLICIT = /\b(take (a |our |this )?survey|short survey|rate (us|your experience)|give us feedback|share your feedback)\b/i;
const IMPROVE = /\bhelp (us )?(improve (our|this|the) ((?:web ?)?site|service)|make (our|this|the) ((?:web ?)?site|service) better)\b/i;
const QUESTION = /\bhow (well\b.{0,100}\bmeet your needs|satisfied are you\b.{0,80}\b((?:web ?)?site|experience|service)|was your experience)\b/i;
export const SURVEY_INTENT = new RegExp(`${EXPLICIT.source}|${IMPROVE.source}`, 'i');

export function answeredSurvey(container) {
  // Unknown response widgets may contain restored work without a local gesture.
  if(container.querySelector('input[type="range"],[contenteditable],[role="slider"],[aria-current]:not([aria-current="false"]),[data-selected="true"]'))return true;
  if(container.querySelector('[aria-pressed="true"],[aria-checked="true"],[aria-selected="true"],input:checked'))return true;
  return [...container.querySelectorAll('textarea,input:not([type="button"]):not([type="submit"]):not([type="radio"]):not([type="checkbox"]):not([type="range"]),select')]
    .some(field=>Boolean(field.value));
}
export function isSurveyPrompt(container, text) {
  if(!text || answeredSurvey(container))return false;
  if(EXPLICIT.test(text))return true;
  if(!IMPROVE.test(text) || !QUESTION.test(text))return false;
  // A sequential visible rating group corroborates the invitation. Numbers
  // alone, or invitation text inside a navigation/action control, are insufficient.
  const groups=new Map();
  for(const control of [...container.querySelectorAll('button,[role="radio"]')].slice(0,80)) {
    const value=label(control);
    if(!/^\d{1,2}$/.test(value) || !visible(control))continue;
    const group=control.parentElement;
    if(!groups.has(group))groups.set(group,[]);
    groups.get(group).push(Number(value));
  }
  return [...groups.values()].some(values=>values.length>=3 && values.length<=11 &&
    [0,1].includes(values[0]) && values.every((value,index)=>value===values[0]+index));
}

const compact=text=>text.replace(/\s+/g,'').toLowerCase();
const EPOCH_TEXT=compact("Help us make our website better!Overall, how well did Epoch's website meet your needs today?1234567Not at allCompletelyQuestion 1 of 3");
export function reviewedEpochSurvey(container) {
  // A source-reviewed exception for a copied, misleading accessible name.
  // Exact first-screen evidence includes hidden text; never authorize later answers.
  if(!['epoch.ai','www.epoch.ai'].includes(location.hostname) || !container.matches('.survey-popup') ||
      getComputedStyle(container).position!=='fixed' || compact(container.textContent)!==EPOCH_TEXT || answeredSurvey(container))return false;
  if(container.closest('form') || container.querySelector('a,input,form,textarea,select,iframe,video,audio,[contenteditable],dialog,[role="dialog"],[role="alertdialog"],[aria-modal="true"]'))return false;
  const nodes=[...container.querySelectorAll('*')];
  if(nodes.length>80 || [container,...nodes].some(node=>node.shadowRoot || node instanceof HTMLElement && chrome.dom?.openOrClosedShadowRoot?.(node)))return false;
  if([container,...nodes].some(node=>['::before','::after'].some(pseudo=>
    !['none','normal','""',"''"].includes(getComputedStyle(node,pseudo).content))))return false;
  const controls=[...container.querySelectorAll('button,[role="button"],[role="radio"]')];
  const close=container.querySelector(':scope > .survey-header > button[type="button"][aria-label="Close cookie popup"]');
  const ratings=[...container.querySelectorAll(':scope > .survey-content > .survey-rating > .survey-rating-buttons > button.survey-rating-btn')];
  if(nodes.some(node=>node.hasAttribute('role') ||
    node.hasAttribute('tabindex') && !ratings.includes(node) ||
    node.hasAttribute('aria-label') && node!==close))return false;
  return controls.length===8 && close && visible(close) && !close.disabled &&
    ratings.length===7 && ratings.every((button,index)=>controls.includes(button) && visible(button) && label(button)===String(index+1)) &&
    container.querySelector(':scope > .survey-title')?.textContent.trim()==="Overall, how well did Epoch's website meet your needs today?" &&
    container.querySelector(':scope > .survey-footer')?.textContent.trim()==='Question 1 of 3';
}
