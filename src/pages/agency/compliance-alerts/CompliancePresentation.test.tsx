import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {ComplianceReviewList, ComplianceSkeleton} from './CompliancePresentation';
const items = [
 {id:'one', title:'First staff', subtitle:'Photo ID', detail:<a href="/staff/one">Open first document</a>},
 {id:'two', title:'Second staff', subtitle:'Certificate', detail:<a href="/staff/two">Open second document</a>},
];
describe('Compliance review workspace', () => {
 it('shows the selected record actions and updates selection accessibly', () => {
  render(<ComplianceReviewList label="Documents" items={items}/>);
  expect(screen.getByRole('button', {name:'Review First staff'})).toHaveAttribute('aria-pressed','true');
  expect(screen.getByRole('link', {name:'Open first document'})).toHaveAttribute('href','/staff/one');
  fireEvent.click(screen.getByRole('button', {name:'Review Second staff'}));
  expect(screen.queryByRole('link', {name:'Open first document'})).not.toBeInTheDocument();
  expect(screen.getByRole('link', {name:'Open second document'})).toHaveAttribute('href','/staff/two');
  const button=screen.getByRole('button', {name:'Review Second staff'});
  expect(screen.getByRole('region', {name:'Second staff details'})).toHaveAttribute('id',button.getAttribute('aria-controls'));
 });
 it('drops stale details when a page changes or accessible results disappear', () => {
  const {rerender}=render(<ComplianceReviewList label="Documents" items={items}/>);
  fireEvent.click(screen.getByRole('button', {name:'Review Second staff'}));
  rerender(<ComplianceReviewList label="Documents" items={[items[0]]}/>);
  expect(screen.queryByRole('link', {name:'Open second document'})).not.toBeInTheDocument();
  expect(screen.getByRole('link', {name:'Open first document'})).toBeVisible();
  rerender(<ComplianceReviewList label="Documents" items={[]}/>);
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
 });
 it('closes the detail, restores focus, and allows selecting a record again', () => {
  const {rerender}=render(<ComplianceReviewList label="Documents" items={items}/>);
  const first=screen.getByRole('button',{name:'Review First staff'});
  fireEvent.click(screen.getByRole('button',{name:'Close selected record'}));
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
  expect(first).toHaveAttribute('aria-pressed','false');
  expect(first).toHaveFocus();
  rerender(<ComplianceReviewList label="Documents" items={[...items]}/>);
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Review Second staff'}));
  expect(screen.getByRole('region',{name:'Second staff details'})).toBeVisible();
 });
 it('announces loading once and keeps placeholders out of the accessibility tree', () => {
  const {container}=render(<ComplianceSkeleton label="Loading document findings"/>);
  expect(screen.getByRole('status',{name:'Loading document findings'})).toBeVisible();
  expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
 });
});
