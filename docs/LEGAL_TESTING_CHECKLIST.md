# Legal Pages Testing Checklist

## Pre-Launch Testing

### ✅ Page Accessibility
- [ ] Privacy Policy loads at `/privacy`
- [ ] Terms of Service loads at `/terms`
- [ ] DPA loads at `/dpa`
- [ ] All pages have proper SEO metadata (title, description)
- [ ] All pages have "Last Updated" date visible

### ✅ Navigation
- [ ] Landing page footer displays legal links
- [ ] Footer links work correctly:
  - [ ] Privacy Policy link
  - [ ] Terms of Service link
  - [ ] DPA link
- [ ] Pricing page shows terms acceptance notice
- [ ] Pricing page terms links work:
  - [ ] Terms of Service link
  - [ ] Privacy Policy link
- [ ] Logo in legal pages links back to home
- [ ] "Back to Home" links work on all legal pages

### ✅ Responsive Design (Mobile)
- [ ] Privacy Policy readable on mobile
- [ ] Terms of Service readable on mobile
- [ ] DPA readable on mobile
- [ ] Footer stacks correctly on mobile
- [ ] Pricing page terms notice visible on mobile
- [ ] No horizontal scrolling issues
- [ ] Font sizes appropriate on all screen sizes

### ✅ Content Verification

#### Privacy Policy
- [ ] All third-party services listed (8 total):
  - [ ] Spotify
  - [ ] Stripe
  - [ ] Google AI/Gemini
  - [ ] YouTube API
  - [ ] LRCLIB
  - [ ] NetEase Music
  - [ ] PeerJS
  - [ ] Vercel
  - [ ] Neon Database
- [ ] Links to third-party privacy policies work
- [ ] Contact email visible: privacy@syns6.com
- [ ] Data retention periods specified
- [ ] User rights (GDPR) explained
- [ ] Microphone disclaimer present ("processed locally, never stored")

#### Terms of Service
- [ ] Subscription model clearly explained:
  - [ ] 3-day free trial
  - [ ] Weekly/Monthly/Yearly plans
  - [ ] Auto-cancel after trial
- [ ] Refund policy clear
- [ ] Payment terms (Stripe) mentioned
- [ ] User conduct rules specified
- [ ] Termination policy explained
- [ ] Contact email visible: support@syns6.com
- [ ] Jurisdiction placeholder needs update: "Governing Law" section

#### DPA
- [ ] All sub-processors listed with:
  - [ ] Purpose
  - [ ] Data processed
  - [ ] Location
  - [ ] GDPR compliance status
  - [ ] DPA links (where applicable)
- [ ] Security measures described
- [ ] International transfer mechanisms explained
- [ ] Data breach notification (72 hours) mentioned
- [ ] Contact emails visible:
  - [ ] privacy@syns6.com
  - [ ] support@syns6.com
  - [ ] eu-rep@syns6.com

### ✅ Legal Compliance
- [ ] GDPR requirements met
- [ ] EU-US Data Privacy Framework mentioned
- [ ] Standard Contractual Clauses (SCCs) referenced
- [ ] PCI DSS compliance (Stripe) noted
- [ ] User rights clearly explained
- [ ] Data retention periods specified
- [ ] Withdrawal of consent mechanism described

### ✅ Styling
- [ ] Consistent dark theme across all pages
- [ ] Proper heading hierarchy (h1 → h2 → h3 → h4)
- [ ] Links hover effects work
- [ ] Sticky top bar works on scroll
- [ ] Footer styling consistent
- [ ] Text readable (proper line height, color contrast)
- [ ] No layout shifts on load

### ✅ Functionality
- [ ] All external links open in new tab
- [ ] All internal links work
- [ ] Back buttons work
- [ ] No console errors
- [ ] No 404 errors
- [ ] Pages load within 2 seconds

## Post-Launch Monitoring

### Week 1
- [ ] Monitor for 404 errors on legal pages
- [ ] Check analytics for page views
- [ ] Verify user can find legal pages easily
- [ ] Test on multiple browsers:
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Safari
  - [ ] Edge
- [ ] Test on multiple devices:
  - [ ] Desktop
  - [ ] Tablet
  - [ ] Mobile (iOS)
  - [ ] Mobile (Android)

### Month 1
- [ ] Review any user feedback on legal pages
- [ ] Check for broken external links
- [ ] Verify third-party privacy policy links still work
- [ ] Confirm sub-processors haven't changed

### Quarterly
- [ ] Review and update sub-processor list
- [ ] Verify data retention policies are followed
- [ ] Check for regulatory changes (GDPR, etc.)
- [ ] Update "Last Updated" date if changes made
- [ ] Notify users of material changes (30 days notice)

## Before Production Launch

### Required Actions
1. **Email Setup:**
   - [ ] Configure privacy@syns6.com
   - [ ] Configure support@syns6.com
   - [ ] Configure eu-rep@syns6.com (if serving EU users)
   - [ ] Test email delivery

2. **Legal Review:**
   - [ ] Attorney reviews Privacy Policy
   - [ ] Attorney reviews Terms of Service
   - [ ] Attorney reviews DPA
   - [ ] Update "Governing Law" jurisdiction in Terms
   - [ ] Verify compliance with local laws

3. **Final Checks:**
   - [ ] All placeholder text removed
   - [ ] All contact emails functional
   - [ ] All third-party links working
   - [ ] SEO metadata complete
   - [ ] Mobile responsive verified

4. **User Flow Testing:**
   - [ ] New user signup → sees trial terms
   - [ ] Pricing page → terms acceptance visible
   - [ ] Footer → legal pages accessible
   - [ ] Can find privacy policy from anywhere
   - [ ] Can find terms from pricing page

## Testing Commands

```bash
# Test dev build
npm run dev

# Visit in browser:
# http://localhost:3000/privacy
# http://localhost:3000/terms
# http://localhost:3000/dpa
# http://localhost:3000/ (check footer)
# http://localhost:3000/pricing (check terms notice)

# Test production build
npm run build
npm run start

# Check for errors
# Open browser console (F12)
# Look for errors or warnings
```

## Browser Testing URLs

### Development
- Landing: `http://localhost:3000/`
- Privacy: `http://localhost:3000/privacy`
- Terms: `http://localhost:3000/terms`
- DPA: `http://localhost:3000/dpa`
- Pricing: `http://localhost:3000/pricing`

### Production (Replace with your domain)
- Landing: `https://syns6.com/`
- Privacy: `https://syns6.com/privacy`
- Terms: `https://syns6.com/terms`
- DPA: `https://syns6.com/dpa`
- Pricing: `https://syns6.com/pricing`

## Known Issues / Notes

- **Microphone Disclaimer:** Ensure users understand audio is processed locally
- **Auto-Cancel:** Make sure subscription auto-cancels after trial (not auto-renew)
- **No CC Required:** For Product Hunt promo, verify no credit card required for trial
- **Jurisdiction:** Update governing law section before launch (currently placeholder)
- **Email Addresses:** Set up all three email addresses before launch

## Success Criteria

- [ ] All pages load without errors
- [ ] All navigation links work
- [ ] Mobile experience is smooth
- [ ] No linter errors
- [ ] No console errors
- [ ] Attorney has reviewed and approved
- [ ] Contact emails are functional
- [ ] Users can easily find legal pages
- [ ] Terms acceptance visible on pricing page
- [ ] Footer present on landing page

## Emergency Contacts

If issues arise:
1. Privacy concerns: privacy@syns6.com
2. Technical issues: support@syns6.com
3. Legal questions: [Add your attorney contact]

## Rollback Plan

If critical issues found:
1. Revert footer changes in `/src/app/page.tsx`
2. Revert pricing page changes in `/src/app/pricing/page.tsx`
3. Remove legal page folders if needed
4. Redeploy previous version
5. Fix issues in development
6. Re-test before re-deploying

## Sign-Off

Before launch, confirm:
- [ ] Developer review complete
- [ ] Legal review complete
- [ ] All testing passed
- [ ] Email addresses active
- [ ] Jurisdiction updated
- [ ] Ready for production

---

**Last Updated:** November 28, 2025
**Prepared By:** AI Assistant
**Status:** Ready for Testing

