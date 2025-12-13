// Icon mapping from lucide-react to react-icons
// Using Ionicons 5 (io5) for consistency

const iconMapping = {
    // Arrows
    'ArrowLeft': 'IoArrowBack',
    'ArrowRight': 'IoArrowForward',
    'ChevronLeft': 'IoChevronBack',
    'ChevronRight': 'IoChevronForward',
    'ChevronDown': 'IoChevronDown',

    // People
    'Users': 'IoPeople',
    'User2': 'IoPerson',
    'UserPlus': 'IoPersonAdd',
    'UserCheck': 'IoCheckmarkCircle',
    'UserX': 'IoCloseCircle',
    'UserMinus': 'IoRemoveCircle',

    // Objects
    'School': 'IoSchool',
    'Calendar': 'IoCalendar',
    'Clock': 'IoTime',
    'Mail': 'IoMail',
    'FileText': 'IoDocument',
    'Copy': 'IoCopy',
    'BookOpen': 'IoBook',
    'Upload': 'IoCloudUpload',
    'Link': 'IoLink',

    // Actions
    'Check': 'IoCheckmark',
    'CheckCircle': 'IoCheckmarkCircle',
    'X': 'IoClose',
    'Plus': 'IoAdd',
    'Edit': 'IoCreate',
    'Settings': 'IoSettings',
    'LogOut': 'IoLogOut',
    'RefreshCw': 'IoRefresh',
    'Loader2': 'IoSync',

    // Status
    'AlertCircle': 'IoAlertCircle',
    'AlertTriangle': 'IoWarning',
    'Info': 'IoInformationCircle',
    'Filter': 'IoFunnel',
    'Search': 'IoSearch',
};

// Import statement for react-icons
const reactIconsImport = "import { IoArrowBack, IoArrowForward, IoChevronBack, IoChevronForward, IoChevronDown, IoPeople, IoPerson, IoPersonAdd, IoCheckmarkCircle, IoCloseCircle, IoRemoveCircle, IoSchool, IoCalendar, IoTime, IoMail, IoDocument, IoCopy, IoBook, IoCloudUpload, IoLink, IoCheckmark, IoClose, IoAdd, IoCreate, IoSettings, IoLogOut, IoRefresh, IoSync, IoAlertCircle, IoWarning, IoInformationCircle, IoFunnel, IoSearch } from 'react-icons/io5';";

module.exports = { iconMapping, reactIconsImport };
