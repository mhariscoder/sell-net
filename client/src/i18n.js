import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import globalEngLng from './views/admin/languages/en.json';
import userEnLng from './views/admin/user/languages/en.json';
import profileEnLng from './views/admin/profile/languages/en.json';

import userUrLng from './views/admin/user/languages/ur.json';
import profileFrLng from './views/admin/profile/languages/fr.json';
import truckEnLng from './views/admin/trucks/languages/en.json'
import truckUrLng from './views/admin/trucks/languages/ur.json'
import roleEnLng from './views/admin/roles/languages/en.json'
import roleUrLng from './views/admin/roles/languages/ur.json'
import permissionEnLng from './views/admin/permission/languages/en.json'
import permissionUrLng from './views/admin/permission/languages/ur.json'
import SampleDataEnLng from './views/admin/modals/samplerModal/languages/en.json'
import SampleDataUrLng from './views/admin/modals/samplerModal/languages/ur.json'
import QAEnLng from './views/admin/modals/qaModal/languages/en.json'
import QAUrLng from './views/admin/modals/qaModal/languages/ur.json'
import sampleEnLng from './views/admin/sampler/languages/en.json'
import sampleUrLng from './views/admin/sampler/languages/ur.json'
import globalUrLng from './views/admin/languages/ur.json';
import storeEnLng from './views/admin/store/languages/en.json';
import storeUrLng from './views/admin/store/languages/ur.json';
import marketplaceEnLng from './views/admin/marketplace/languages/en.json';
import marketplaceUrLng from './views/admin/marketplace/languages/ur.json';
import listingEnLng from './views/admin/listing/languages/en.json';
import listingUrLng from './views/admin/listing/languages/ur.json';

const resources = {
  en: {
    global: globalEngLng,
    user: userEnLng,
    profile: profileEnLng,
    truck: truckEnLng,
    roles: roleEnLng,
    permission: permissionEnLng,
    sampleData: SampleDataEnLng,
    sample: sampleEnLng,
    qa: QAEnLng,
    store: storeEnLng,
    marketplace: marketplaceEnLng,
    listing: listingEnLng
  },
  ur: {
    global: globalUrLng,
    user: userUrLng,
    profile: profileFrLng,
    truck: truckUrLng,
    roles: roleUrLng,
    permission: permissionUrLng,
    sampleData: SampleDataUrLng,
    sample: sampleUrLng,
    qa: QAUrLng,
    store: storeUrLng,
    marketplace: marketplaceUrLng,
    listing: listingUrLng
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    ns: ["global", "user", "profile", "truck", "roles", "permission", "sampleData", "qa", "sample", "store", "marketplace", "listing"],
    defaultNS: "global",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;