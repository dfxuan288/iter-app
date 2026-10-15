import type { CategorySplit, CommunityUser, ForumComment, ForumPost } from '@/domain/community';

/**
 * Sample community (brief §11): 30 fictional Malaysian travellers, with trip summaries and posts
 * for Tokyo, Bangkok, Seoul, Bali and Singapore. Every destination has six trip summaries, so its
 * "typical trip" can be worked out. Tokyo's give the brief's "Typical 5-day Tokyo trip: RM 2,900 ·
 * Food 34% · Stay 31%". Tips are kept general so the demo makes no claims about real businesses.
 */

const names: [string, string][] = [
  ['Nurul A.', 'Kuala Lumpur'],
  ['Wei Jie L.', 'Penang'],
  ['Priya S.', 'Petaling Jaya'],
  ['Hafiz R.', 'Shah Alam'],
  ['Mei Ling T.', 'Ipoh'],
  ['Arjun K.', 'Johor Bahru'],
  ['Siti H.', 'Kota Bharu'],
  ['Jason W.', 'Kuching'],
  ['Farah Z.', 'Kuala Lumpur'],
  ['Kavitha R.', 'Klang'],
  ['Daniel C.', 'Melaka'],
  ['Aisyah M.', 'Putrajaya'],
  ['Kelvin O.', 'Kota Kinabalu'],
  ['Syafiq I.', 'Seremban'],
  ['Joanne L.', 'Subang Jaya'],
  ['Ravi N.', 'Penang'],
  ['Hui Min C.', 'Kuala Lumpur'],
  ['Amirul H.', 'Alor Setar'],
  ['Deepa M.', 'Cyberjaya'],
  ['Marcus T.', 'Petaling Jaya'],
  ['Nadia S.', 'Johor Bahru'],
  ['Jun Hao Y.', 'Kuantan'],
  ['Zulaikha A.', 'Kuala Terengganu'],
  ['Sharon G.', 'Ipoh'],
  ['Imran F.', 'Kuala Lumpur'],
  ['Li Ying W.', 'Miri'],
  ['Haziq Z.', 'Bangi'],
  ['Shalini P.', 'Shah Alam'],
  ['Ethan K.', 'Sibu'],
  ['Balqis N.', 'Kajang'],
];

export const communityUsers: CommunityUser[] = names.map(([displayName, from], index) => ({ id: `cu-${index + 1}`, displayName, from }));

/** [user number, days, total RM, split (food, transport, stay, activities, shopping), tip, when, likes, shared on] */
type SummaryRow = [number, number, number, [number, number, number, number, number], string, string, number, string];
/** [user number, text, likes, posted on] */
type PostRow = [number, string, number, string];

const summaries: Record<string, SummaryRow[]> = {
  tokyo: [
    [1, 5, 2900, [35, 12, 30, 10, 13], 'Set up Suica on your phone before you land. The ticket machine queue at the airport can be long.', 'Oct 2026', 42, '2026-10-28'],
    [2, 4, 2300, [33, 14, 32, 11, 10], 'There are several halal ramen shops around Ueno and Asakusa. Search before you go, they fill up at lunch.', 'Sep 2026', 57, '2026-09-30'],
    [3, 6, 3500, [34, 11, 31, 9, 15], 'Business hotels near Ueno cost about half of Shinjuku and are 25 minutes away on the Yamanote line.', 'Aug 2026', 31, '2026-08-25'],
    [4, 5, 2800, [36, 13, 31, 10, 10], 'Convenience store breakfasts saved me about RM 30 a day. Onigiri and hot coffee for under ¥500.', 'Oct 2026', 24, '2026-10-12'],
    [5, 7, 4100, [32, 12, 30, 12, 14], 'Book the popular observation decks and digital art museums online a week ahead. Walk-in slots go by noon.', 'Sep 2026', 19, '2026-09-18'],
    [6, 5, 3000, [34, 11, 32, 8, 15], 'Keep receipts from tax-free shops together. From November you claim the tax back at the airport.', 'Nov 2026', 66, '2026-11-08'],
  ],
  bangkok: [
    [7, 5, 1800, [30, 10, 32, 12, 16], 'Take the BTS or MRT at rush hour. Ride-hailing is cheap but you can sit in traffic for an hour.', 'Oct 2026', 38, '2026-10-26'],
    [8, 4, 1350, [33, 9, 30, 13, 15], 'Chatuchak market is a weekend thing. Go early, it is very hot by 11 am.', 'Sep 2026', 22, '2026-09-21'],
    [9, 6, 2200, [31, 10, 33, 11, 15], 'Many restaurants add "++": 10% service and 7% VAT. Check the menu before you order.', 'Oct 2026', 47, '2026-10-09'],
    [10, 5, 1700, [34, 8, 31, 12, 15], 'Muslim-friendly food is easy to find around Bang Rak and near the big mosques.', 'Aug 2026', 29, '2026-08-30'],
    [11, 3, 1100, [32, 11, 35, 10, 12], 'The airport rail link into the city is far cheaper than a taxi and skips the traffic.', 'Jul 2026', 15, '2026-07-19'],
    [12, 5, 1750, [30, 9, 30, 14, 17], 'Change money at a city money changer rather than the airport. The rate is noticeably better.', 'Oct 2026', 33, '2026-10-17'],
  ],
  seoul: [
    [13, 5, 2300, [30, 12, 33, 12, 13], 'Get a T-money card at any convenience store. It works on the subway and buses, and in many shops.', 'Oct 2026', 36, '2026-10-24'],
    [14, 6, 2700, [31, 11, 32, 11, 15], 'Many Myeongdong cosmetics shops are tax-free. Bring your passport when you go shopping.', 'Sep 2026', 28, '2026-09-27'],
    [15, 4, 1800, [33, 12, 31, 13, 11], 'Halal restaurants are easy to find near the Itaewon mosque.', 'Aug 2026', 44, '2026-08-21'],
    [16, 5, 2200, [29, 13, 34, 10, 14], 'A Korean map app works much better than international ones for walking and transit directions.', 'Oct 2026', 51, '2026-10-14'],
    [17, 7, 3200, [30, 11, 33, 12, 14], 'Stay near Hongdae for cheaper rooms and late-night food.', 'Sep 2026', 17, '2026-09-12'],
    [18, 5, 2250, [32, 12, 32, 11, 13], 'Palace entry is free if you wear hanbok. Rental shops are right outside the gates.', 'Oct 2026', 25, '2026-10-06'],
  ],
  bali: [
    [19, 6, 1800, [28, 14, 36, 14, 8], 'Hire a driver for the day instead of taking taxis. One day covers Ubud and the rice terraces.', 'Oct 2026', 40, '2026-10-20'],
    [20, 5, 1500, [27, 15, 37, 13, 8], 'Villas in Ubud are cheaper and quieter than the beach areas. Booking direct is often cheaper.', 'Sep 2026', 26, '2026-09-24'],
    [21, 7, 2100, [29, 13, 35, 15, 8], 'Carry small rupiah notes. Many small warungs cannot change a large note.', 'Aug 2026', 34, '2026-08-28'],
    [22, 6, 1850, [30, 12, 36, 13, 9], 'Sunset at Uluwatu is worth it, but leave before dark. The road back gets jammed.', 'Oct 2026', 21, '2026-10-11'],
    [23, 4, 1250, [31, 14, 34, 13, 8], 'Plenty of halal warungs around Kuta. Look for the halal sign or ask.', 'Jul 2026', 18, '2026-07-25'],
    [24, 6, 1700, [28, 13, 37, 14, 8], 'If you plan to ride a scooter, check that your travel insurance covers it.', 'Sep 2026', 12, '2026-09-08'],
  ],
  singapore: [
    [25, 3, 1650, [33, 8, 40, 13, 6], 'Tap your contactless bank card on the MRT. No need to buy a separate travel card.', 'Oct 2026', 45, '2026-10-19'],
    [26, 4, 2200, [32, 9, 39, 12, 8], 'Hawker centres are the best value meals. Most have halal-certified stalls.', 'Sep 2026', 37, '2026-09-29'],
    [27, 3, 1600, [35, 7, 41, 11, 6], 'Book hotels early for long weekends. Prices nearly double.', 'Aug 2026', 19, '2026-08-23'],
    [28, 2, 1100, [34, 9, 40, 12, 5], 'The evening light show at Gardens by the Bay is free.', 'Oct 2026', 27, '2026-10-04'],
    [29, 3, 1700, [31, 8, 42, 13, 6], 'The bus from Johor Bahru across the causeway is cheap, but avoid Friday evenings.', 'Sep 2026', 30, '2026-09-15'],
    [30, 4, 2300, [33, 8, 38, 14, 7], 'Theme park tickets are often cheaper online in advance than at the gate.', 'Oct 2026', 14, '2026-10-02'],
  ],
};

const posts: Record<string, PostRow[]> = {
  tokyo: [
    [9, 'Any halal yakiniku recommendations near Shinjuku? Going next month with my parents.', 9, '2026-11-11'],
    [13, 'The tourist-only subway pass (24, 48 or 72 hours) pays for itself after four or five rides.', 33, '2026-10-20'],
    [17, 'Autumn leaves in the gardens were stunning this week. Go on a weekday morning to avoid the crowds.', 21, '2026-11-13'],
  ],
  bangkok: [
    [2, 'Is the night train to Chiang Mai still worth it? Thinking of adding two days after Bangkok.', 6, '2026-11-02'],
    [20, 'Reminder: the Grand Palace dress code is strict. Long trousers and covered shoulders, or you rent clothes at the gate.', 27, '2026-10-15'],
    [25, 'The big riverside malls have food courts that are a nice break from the heat, and cheaper than they look.', 12, '2026-09-28'],
  ],
  seoul: [
    [3, 'First snow is usually around late November. Packing thermal layers and a proper coat.', 10, '2026-11-10'],
    [21, 'The city tour bus is a good way to see the palaces on day one if you are tired from the flight.', 8, '2026-10-18'],
    [26, 'Anyone tried a night at a jjimjilbang (Korean bathhouse) instead of a hotel? Worth it?', 14, '2026-10-30'],
  ],
  bali: [
    [6, 'Monkey Forest tip: hide your sunglasses and do not carry food. Learned the hard way.', 39, '2026-10-05'],
    [11, 'Is Nusa Penida doable as a day trip from Sanur?', 7, '2026-11-05'],
    [28, 'Rainy season is starting. Mornings were clear, afternoons were downpours.', 16, '2026-11-12'],
  ],
  singapore: [
    [7, 'The waterfall at Changi Airport is worth arriving early for. There is a light show in the evening.', 24, '2026-10-22'],
    [15, 'Best value area to stay with a family of four? Looking at Bugis or Lavender.', 5, '2026-11-09'],
    [19, 'Ride-hailing costs more than in KL. The MRT gets you almost everywhere.', 18, '2026-10-01'],
  ],
};

const user = (n: number) => `cu-${n}`;
const at = (date: string) => `${date}T10:00:00.000Z`;
const split = ([food, transport, stay, activities, shopping]: SummaryRow[3]): CategorySplit => ({ food, transport, stay, activities, shopping });

export const communityPosts: ForumPost[] = Object.entries(summaries).flatMap(([destinationId, rows]) => [
  ...rows.map(([n, days, total, parts, tip, when, likes, date], index): ForumPost => ({
    id: `cp-${destinationId}-trip-${index + 1}`,
    userId: user(n),
    destinationId,
    type: 'trip_summary',
    body: '',
    tripSummary: { days, totalMyr: total * 100, split: split(parts), tip, when },
    likes,
    createdAt: at(date),
  })),
  ...(posts[destinationId] ?? []).map(([n, body, likes, date], index): ForumPost => ({
    id: `cp-${destinationId}-post-${index + 1}`,
    userId: user(n),
    destinationId,
    type: 'post',
    body,
    likes,
    createdAt: at(date),
  })),
]);

/** [post id, user number, comment, posted on] */
const commentRows: [string, number, string, string][] = [
  ['cp-tokyo-post-1', 2, 'There are a few halal yakiniku places around Shinjuku and Asakusa. Check the certificate at the door.', '2026-11-11'],
  ['cp-tokyo-post-1', 15, 'Book ahead on weekends, the halal ones are small.', '2026-11-12'],
  ['cp-tokyo-trip-1', 4, 'Phone Suica worked perfectly for me too. Saved so much time.', '2026-10-29'],
  ['cp-tokyo-trip-2', 9, 'Thank you! Exactly what I needed.', '2026-10-01'],
  ['cp-tokyo-trip-2', 23, 'Went to one near Asakusa, the queue was 30 minutes but worth it.', '2026-10-03'],
  ['cp-tokyo-trip-6', 1, 'Did the airport kiosk work smoothly?', '2026-11-09'],
  ['cp-tokyo-trip-6', 6, 'Yes, took five minutes. Do it before you check in your bags.', '2026-11-09'],
  ['cp-tokyo-post-2', 5, 'Agree, used mine every day.', '2026-10-21'],
  ['cp-bangkok-trip-3', 12, 'The "++" caught me out on day one. Good tip.', '2026-10-10'],
  ['cp-bangkok-post-1', 8, 'Did it last year. Book the lower berth, it is more comfortable.', '2026-11-03'],
  ['cp-bangkok-post-2', 10, 'They also check for ripped jeans!', '2026-10-16'],
  ['cp-bangkok-trip-1', 11, 'BTS all the way. Got everywhere in 20 minutes.', '2026-10-27'],
  ['cp-seoul-trip-3', 18, 'So many good options there. We went twice.', '2026-08-22'],
  ['cp-seoul-trip-4', 13, 'Yes! The other apps kept sending me the wrong way.', '2026-10-15'],
  ['cp-seoul-post-3', 17, 'Did it for one night. Fun, but bring earplugs.', '2026-10-31'],
  ['cp-seoul-post-1', 16, 'Same plan. Heard it gets cold fast in December.', '2026-11-11'],
  ['cp-bali-post-1', 22, 'Haha, one stole my water bottle.', '2026-10-06'],
  ['cp-bali-post-2', 19, 'Yes, take the early fast boat and book the return before you go.', '2026-11-06'],
  ['cp-bali-trip-1', 21, 'How much did the driver cost for the day?', '2026-10-21'],
  ['cp-bali-trip-1', 19, 'Around RM 180 including petrol, split between four of us.', '2026-10-21'],
  ['cp-bali-trip-3', 24, 'Small notes saved me so many times.', '2026-08-29'],
  ['cp-singapore-trip-2', 27, 'Hawker centres are the best. Cheap and so many choices.', '2026-09-30'],
  ['cp-singapore-post-2', 26, 'Lavender is quieter and close to the MRT. We liked it.', '2026-11-10'],
  ['cp-singapore-trip-5', 25, 'Friday evening jam is real. Took me three hours once.', '2026-09-16'],
  ['cp-singapore-post-1', 28, 'The rain vortex at night is beautiful.', '2026-10-23'],
];

export const communityComments: ForumComment[] = commentRows.map(([postId, n, body, date], index) => ({
  id: `cc-${index + 1}`,
  postId,
  userId: user(n),
  body,
  createdAt: at(date),
}));
