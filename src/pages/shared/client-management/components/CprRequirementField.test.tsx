import {useState} from 'react';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect,beforeAll,afterAll} from 'vitest';
const originals=new Map<string,PropertyDescriptor|undefined>();
beforeAll(()=>{for(const name of ['hasPointerCapture','setPointerCapture','releasePointerCapture','scrollIntoView']){originals.set(name,Object.getOwnPropertyDescriptor(HTMLElement.prototype,name));Object.defineProperty(HTMLElement.prototype,name,{configurable:true,value:()=>false});}});
afterAll(()=>{for(const [name,descriptor] of originals){if(descriptor)Object.defineProperty(HTMLElement.prototype,name,descriptor);else Reflect.deleteProperty(HTMLElement.prototype,name);}});
import {CprRequirementField} from './CprRequirementField';
it('keeps unanswered distinct and permits yes, no and clearing the answer',async()=>{
 function Form(){const [value,setValue]=useState<boolean|undefined>();return <><CprRequirementField value={value} onChange={setValue}/><output>{String(value)}</output></>;}
 render(<Form/>);const user=userEvent.setup();expect(screen.getByRole('status').textContent).toBe('undefined');
 for(const [label,value] of [['Yes','true'],['No','false'],['Not recorded','undefined']]){
  await user.click(screen.getByRole('combobox',{name:'Does this service require CPR-trained staff?'}));
  await user.click(screen.getByRole('option',{name:label}));expect(screen.getByRole('status').textContent).toBe(value);
 }
});
