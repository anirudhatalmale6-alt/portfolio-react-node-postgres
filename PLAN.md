# Portfolio project — the plan

Everything I would have said on a call, written down so you can re-read it, hold me to
it, and check it off as we go.

---

## Where the project already is

The build is not starting from zero — I built the core of it before writing this, so you
could judge the work rather than the pitch.

Working today, in the repo:

- React front end — home, blog index with tag filtering, post pages, contact form
- Node/Express API and a PostgreSQL database behind it
- Blog with comments held for approval, so nothing appears on a post until you say so
- An admin panel where you write, edit, schedule and publish posts yourself
- A contact inbox, so messages land somewhere you can read them
- 43 API tests and 47 browser tests, all passing

What is **not** done: it is not deployed anywhere, and it is not yet built to your
design. Both of those are below.

---

## The stack, since you asked

React, Node and PostgreSQL — the three you named — are the right fit here, and not just
because you named them.

The part of your site that actually needs a database is the blog: articles, comments,
drafts, publish dates, tags. That is relational data with relationships between the
pieces, which is exactly what Postgres is good at. Comments in particular need to be
stored somewhere you can moderate them, and a file-based blog cannot do that.

So: no change recommended. We build what you asked for.

---

## The six stages

### 1. Design — I build to your references

You send the design references and I build to those. This is the stage I am currently
waiting on.

I have deliberately kept the current look plain, because you told me you have specific
requirements and I would rather build yours than talk you out of it. Colours, fonts,
spacing and corner radius all live in one block at the top of one stylesheet, so
reskinning is fast once I can see what I am aiming at.

*What I need from you:* screenshots, links to sites you like, a Figma export, or even a
sketch. If you have a reference site, telling me **what specifically** you like about it
is worth more than the link on its own.

*Risk:* "make it look good" with no reference is the one instruction that reliably
produces something neither of us wanted. This stage is the cheapest place to be picky.

### 2. Content — your words

Your intro, your project write-ups, your first blog posts.

Two things are worth knowing here. Your name, intro, links and skills live in a config
file, so I set those. But **posts and projects go in through the admin panel**, which
means you can write them yourself from day one and never wait on me to publish an
article.

*Risk:* content is the stage that stalls projects. Placeholder text is fine to launch
with — a live site with three real posts beats a perfect site that never ships.

### 3. Domain

You buy this, in your own name, with your own card. It should never be in mine — a
domain registered to your developer is a problem you find out about at the worst
possible moment.

**My recommendation: Cloudflare Registrar.** They sell domains at cost with no markup,
and — the part that matters — **the renewal price is the same as the first year**. Most
registrars advertise a cheap first year and quietly triple it at renewal. A `.com` is
about $10–11 a year, and it stays about $10–11 a year. If Cloudflare does not sell the
ending you want, Porkbun is the fallback, on the same "check the renewal price, not the
first-year price" principle.

*What I need from you:* the domain name you want. Check it is free before you fall in
love with it. Shorter is better, hyphens and creative spellings are not.

*Risk:* this is the one purchase that is genuinely permanent-ish. Changing a domain later
means every link anyone has shared breaks.

### 4. Hosting and database

**My recommendation: Render.** One service runs both the API and the site, with a
managed Postgres alongside it. Again — your account, your card.

Cost, honestly:

- **Free to start.** Render's free tier will run this. The catch is the service sleeps
  after inactivity, so the first visitor after a quiet spell waits a few seconds for it
  to wake, and their free database expires after 30 days. Fine for looking at it, not
  fine for a portfolio you are sending to employers.
- **About $13 a month** for the real thing: the web service (~$7) and the database (~$6).
  Always on, no cold starts, automatic daily backups of the database.

There is a `render.yaml` already in the repo that describes this setup, so the
configuration is not something I invent on the day.

*What I need from you:* create the Render account and add me, or create it and paste me
the environment values — whichever you prefer. I cannot create it for you; it needs your
card and your email, and it should be yours anyway.

*Risk:* if you start on the free tier, remember the database expires. Moving to the paid
database later is a migration, not a button, so it is cheaper to start paid if you know
you want the site to stay up.

### 5. Deployment

Once the two accounts exist, this is my work, not yours:

- Connect the repo to Render so a push deploys automatically
- Create the database and run the migrations that build the tables
- Set the environment variables, including generating a real session-signing secret
- Create your admin login
- Point the domain's DNS at the service and confirm HTTPS is live on both
  `yourdomain.com` and `www.yourdomain.com`
- Check it end to end on the real domain: post published, comment submitted, comment
  approved, comment visible, contact message received

DNS is the one step with a waiting period built in — usually minutes, occasionally a few
hours. Nothing is broken during that window; the internet is just catching up.

### 6. Handover

- A written walkthrough of the admin panel — how to write a post, schedule it, approve a
  comment, read a message
- Where to change your name, links and colours, and which file each lives in
- How to redeploy, and what to do if a deploy fails
- The repo, which is yours — you can hand it to any developer later

---

## What each of us does

| | You | Me |
| --- | --- | --- |
| Design references and content | ✅ | |
| Buying the domain | ✅ | |
| Creating the hosting account | ✅ | |
| Building the site to your design | | ✅ |
| Database setup and migrations | | ✅ |
| Deployment, DNS, HTTPS | | ✅ |
| Writing blog posts, forever after | ✅ | |

The pattern: anything that needs your card or your name is yours. Everything technical is
mine.

---

## Questions you would have asked on a call

**How do I pay you?**
Milestones. As I finish a piece of work, I ask for a small release for that piece. You
only pay for what is already in front of you. I do not ask for money up front and I do
not ask you to commit to a total before either of us knows what the design involves.

**What if I don't like how the design turns out?**
Tell me and I change it. That is why stage 1 is references-first — I would rather find out
we disagree from a screenshot than from a finished site. Revisions to something I built
from your references are part of the job, not an extra.

**Can I write blog posts without you?**
Yes, that is the entire point of the admin panel. Log in, write in the editor, hit
publish. You can also save drafts and set a future date to schedule a post.

**What stops my comments filling up with spam?**
Nothing is published automatically. Every comment waits for your approval, and the admin
panel shows a count of what is waiting. There is also a hidden field in the form that
real people never fill in and bots almost always do, plus a rate limit, so most junk
never reaches your review queue at all.

**What if I want to stop paying for hosting later?**
Your site, your accounts, your repo, your domain. You can move it to any other host or
hand it to any other developer — nothing in it is locked to me. That is deliberate.

**Who can see the code?**
The repo is public right now because that is my default and it is useful for a portfolio.
Say the word and I will make it private — it is one setting.

**How long will it take?**
The build largely exists. Realistically the timeline is set by how fast the references
and content arrive and how fast the two accounts get created, not by the coding. Once I
have references, reskinning is days, not weeks. Deployment, once accounts exist, is the
same day.

**Can we do a call?**
No — text only, and that is a limitation on my side, not a preference about you. It is
also genuinely better for a project like this: decisions in writing survive, and neither
of us has to remember what was agreed. If that is a dealbreaker I would rather know now
than waste your time.

---

## What this project does not include

Saying this up front so nothing ambushes either of us later:

- **I do not pay for the domain or the hosting.** Those are yours, in your name, and
  you pay the provider directly. The figures above are my estimates of their prices, not
  a quote from me.
- **I cannot create your accounts for you.** Render and the registrar both need your card
  and your email. I can walk you through the signup, but I cannot click through it.
- **No email inbox.** The contact form stores messages in your database and shows them in
  the admin panel. It does not send you an email when one arrives. Adding email
  notifications is possible and is extra work — say so if you want it and I will scope it.
- **No analytics.** No visitor tracking unless you ask for it.
- **Logo and photography are not included.** I build the site; I do not design a logo or
  take photographs. If you have them I will use them.
- **No content writing.** The blog posts and the copy about you have to come from you —
  a portfolio written by someone else reads like one.
- **Ongoing maintenance is not included** in the build. The site will run fine on its own;
  if you want me on call for changes later, that is a separate arrangement.
