import {test,expect} from '@playwright/test';
import {plan,shape} from '../src/prompt-model.js';
const parent={id:'parent',purpose:'sale-sharing',value:true,grantsWhen:true,control:{activation:'toggle'}};
const child={id:'child',purpose:'advertising',value:true,grantsWhen:true,observed:true};
test('observed children never become actions, regardless of input order',()=>{
 expect(plan({stage:'preferences',preferences:[child,parent]})).toMatchObject({type:'set-preference',id:'parent',goal:false});
 expect(plan({stage:'preferences',preferences:[child,{...parent,value:false}],save:{}})).toEqual({type:'stop',reason:'inconsistent-preferences'});
 expect(plan({stage:'preferences',preferences:[{...child,value:false},{...parent,value:false}],save:{}})).toMatchObject({type:'save'});
});
test('observation-only status belongs to the consent shape',()=>{
 expect(shape({preferences:[child,parent]})).not.toBe(shape({preferences:[{...child,observed:false},parent]}));
});
test('observation-only preferences still require known purposes and boolean values',()=>{
 for(const changed of [{purpose:'unknown'},{value:null},{grantsWhen:undefined}])expect(plan({stage:'preferences',preferences:[{...child,...changed},parent]}).type).toBe('stop');
});
